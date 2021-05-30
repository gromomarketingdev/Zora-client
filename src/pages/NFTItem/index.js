import React, { useEffect, useMemo, useState, useRef, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Chart } from 'react-charts';
import cx from 'classnames';
import axios from 'axios';
import { ethers } from 'ethers';
import Loader from 'react-loader-spinner';
import 'react-loader-spinner/dist/loader/css/react-spinner-loader.css';
import Skeleton from 'react-loading-skeleton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';
import { useWeb3React } from '@web3-react/core';
import { ClipLoader } from 'react-spinners';
import Tooltip from '@material-ui/core/Tooltip';
import {
  People as PeopleIcon,
  ViewModule as ViewModuleIcon,
} from '@material-ui/icons';

import Panel from '../../components/Panel';
import ResizableBox from '../../components/ResizableBox';
import Identicon from 'components/Identicon';
import {
  fetchTokenURI,
  increaseViewCount,
  getOffers,
  getTradeHistory,
  fetchCollection,
  getUserAccountDetails,
  getTokenType,
  get1155Info,
} from 'api';
import {
  getSalesContract,
  getNFTContract,
  getListing,
  listItem,
  cancelListing,
  updateListing,
  buyItem,
  getWFTMBalance,
  getAllowance,
  approve,
  createOffer,
  cancelOffer,
  acceptOffer,
  getAuctionContract,
  getAuction,
  createAuction,
  cancelAuction,
  updateAuctionStartTime,
  updateAuctionEndTime,
  updateAuctionReservePrice,
  getHighestBidder,
  placeBid,
  withdrawBid,
  resultAuction,
  SALES_CONTRACT_ADDRESS,
  WFTM_ADDRESS,
  AUCTION_CONTRACT_ADDRESS,
} from 'contracts';
import { shortenAddress } from 'utils';
import toast from 'utils/toast';
import SellModal from 'components/SellModal';
import OfferModal from 'components/OfferModal';
import AuctionModal from 'components/AuctionModal';
import BidModal from 'components/BidModal';
import OwnersModal from 'components/OwnersModal';
import Header from 'components/header';
import SuspenseImg from 'components/SuspenseImg';

import webIcon from 'assets/svgs/web.svg';
import discordIcon from 'assets/svgs/discord.svg';
import telegramIcon from 'assets/svgs/telegram.svg';
import twitterIcon from 'assets/svgs/twitter.svg';
import mediumIcon from 'assets/svgs/medium.svg';
import filterIcon from 'assets/svgs/filter.svg';

import styles from './styles.module.scss';

const NFTItem = () => {
  const { addr: address, id: tokenID } = useParams();

  const { account, chainId } = useWeb3React();

  const [salesContractApproved, setSalesContractApproved] = useState(false);
  const [salesContractApproving, setSalesContractApproving] = useState(false);
  const [auctionContractApproved, setAuctionContractApproved] = useState(false);
  const [auctionContractApproving, setAuctionContractApproving] = useState(
    false
  );

  const [minBidIncrement, setMinBidIncrement] = useState(0);
  const [withdrawLockTime, setWithdrawLockTime] = useState(0);
  const [info, setInfo] = useState();
  const [owner, setOwner] = useState();
  const [ownerInfo, setOwnerInfo] = useState();
  const [ownerInfoLoading, setOwnerInfoLoading] = useState(false);
  const [tokenType, setTokenType] = useState();
  const [tokenInfo, setTokenInfo] = useState();
  const [collection, setCollection] = useState();
  const [collectionLoading, setCollectionLoading] = useState(false);

  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [auctionModalVisible, setAuctionModalVisible] = useState(false);
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [ownersModalVisible, setOwnersModalVisible] = useState(false);

  const [itemListing, setItemListing] = useState(false);
  const [priceUpdating, setPriceUpdating] = useState(false);
  const [offerPlacing, setOfferPlacing] = useState(false);
  const [offerCanceling, setOfferCanceling] = useState(false);
  const [offerAccepting, setOfferAccepting] = useState(false);
  const [auctionStarting, setAuctionStarting] = useState(false);
  const [auctionUpdating, setAuctionUpdating] = useState(false);
  const [auctionCanceling, setAuctionCanceling] = useState(false);
  const [bidPlacing, setBidPlacing] = useState(false);
  const [bidWithdrawing, setBidWithdrawing] = useState(false);
  const [resulting, setResulting] = useState(false);
  const [resulted, setResulted] = useState(false);

  const [bid, setBid] = useState(null);
  const [winner, setWinner] = useState(null);
  const [winningBid, setWinningBid] = useState(null);
  const [views, setViews] = useState();
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const auction = useRef(null);
  const listing = useRef(null);
  const offers = useRef([]);
  const tradeHistory = useRef([]);

  const { isConnected: isWalletConnected } = useSelector(
    state => state.ConnectWallet
  );

  const isLoggedIn = () => {
    return isWalletConnected && chainId === 250;
  };

  const getTokenURI = async () => {
    setLoading(true);
    try {
      const { data: tokenURI } = await fetchTokenURI(address, tokenID);
      const { data } = await axios.get(tokenURI);
      setInfo(data);
    } catch {
      console.log('Token URI not available');
    }
    setLoading(false);
  };

  const getTokenOwner = async () => {
    try {
      setOwnerInfoLoading(true);
      const type = await getTokenType(address);
      setTokenType(type);
      if (type === 721) {
        const [contract] = await getNFTContract(address);
        const res = await contract.ownerOf(tokenID);
        setOwner(res);
        try {
          const { data } = await getUserAccountDetails(res);
          setOwnerInfo(data);
        } catch {
          setOwnerInfo(null);
        }
      } else if (type === 1155) {
        const { data: _tokenInfo } = await get1155Info(address, tokenID);
        setTokenInfo(_tokenInfo);
      }
    } catch {
      setOwner(null);
    } finally {
      setOwnerInfoLoading(false);
    }
  };

  const getItemListings = async () => {
    try {
      const _listing = await getListing(address, tokenID);
      listing.current = _listing;
    } catch (e) {
      console.log(e);
    }
  };

  const getCurrentOffers = async () => {
    try {
      const { data } = await getOffers(address, tokenID);
      offers.current = data;
    } catch (e) {
      console.log(e);
    }
  };

  const getItemTradeHistory = async () => {
    try {
      const { data } = await getTradeHistory(address, tokenID);
      tradeHistory.current = data;
    } catch (e) {
      console.log(e);
    }
  };

  const getAuctions = async () => {
    try {
      const _auction = await getAuction(address, tokenID);
      if (_auction.endTime !== 0) {
        auction.current = _auction;
      }
    } catch (e) {
      console.log(e);
    }
  };

  const getBid = async () => {
    try {
      const bid = await getHighestBidder(address, tokenID);
      if (bid.bid !== 0) {
        setBid(bid);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const eventMatches = (nft, id) => {
    return (
      address?.toLowerCase() === nft?.toLowerCase() &&
      parseFloat(tokenID) === parseFloat(id.toString())
    );
  };

  const itemListedHandler = (
    owner,
    nft,
    id,
    quantity,
    pricePerItem,
    startingTime,
    isPrivate,
    allowedAddress
  ) => {
    if (eventMatches(nft, id)) {
      listing.current = {
        owner,
        quantity: parseFloat(quantity.toString()),
        pricePerItem: parseFloat(pricePerItem.toString()) / 10 ** 18,
        startingTime: parseFloat(startingTime.toString()),
        allowedAddress,
      };
    }
  };

  const itemUpdatedHandler = (owner, nft, id, newPrice) => {
    if (eventMatches(nft, id)) {
      const newListing = {
        ...listing.current,
        pricePerItem: parseFloat(newPrice.toString()) / 10 ** 18,
      };
      listing.current = newListing;
    }
  };

  const itemCanceledHandler = (owner, nft, id) => {
    if (eventMatches(nft, id)) {
      listing.current = null;
    }
  };

  const itemSoldHandler = (seller, buyer, nft, id, price) => {
    if (eventMatches(nft, id)) {
      listing.current = null;
      setOwner(buyer);
      const newTradeHistory = [...tradeHistory.current];
      newTradeHistory.push({
        from: seller,
        to: buyer,
        price: parseFloat(price.toString()) / 10 ** 18,
        saleDate: new Date().toISOString(),
      });
      tradeHistory.current = newTradeHistory;
    }
  };

  const offerCreatedHandler = (
    creator,
    nft,
    id,
    payToken,
    quantity,
    pricePerItem,
    deadline
  ) => {
    if (eventMatches(nft, id)) {
      const newOffers = [...offers.current];
      newOffers.push({
        creator,
        deadline: parseFloat(deadline.toString()),
        payToken,
        pricePerItem: parseFloat(pricePerItem.toString()) / 10 ** 18,
        quantity: parseFloat(quantity.toString()),
      });
      offers.current = newOffers;
    }
  };

  const offerCanceledHandler = (creator, nft, id) => {
    if (eventMatches(nft, id)) {
      const newOffers = offers.current.filter(
        offer => offer.creator?.toLowerCase() !== creator?.toLowerCase()
      );
      offers.current = newOffers;
    }
  };

  const auctionCreatedHandler = (nft, id) => {
    if (eventMatches(nft, id)) {
      getAuctions();
    }
  };

  const auctionEndTimeUpdatedHandler = (nft, id, _endTime) => {
    if (eventMatches(nft, id)) {
      const endTime = parseFloat(_endTime.toString());
      if (auction.current) {
        const newAuction = { ...auction.current, endTime };
        auction.current = newAuction;
      }
    }
  };

  const auctionStartTimeUpdatedHandler = (nft, id, _startTime) => {
    if (eventMatches(nft, id)) {
      const startTime = parseFloat(_startTime.toString());
      if (auction.current) {
        const newAuction = { ...auction.current, startTime };
        auction.current = newAuction;
      }
    }
  };

  const auctionReservePriceUpdatedHandler = (nft, id, _price) => {
    if (eventMatches(nft, id)) {
      const price = parseFloat(_price.toString()) / 10 ** 18;
      if (auction.current) {
        const newAuction = { ...auction.current, reservePrice: price };
        auction.current = newAuction;
      }
    }
  };

  const minBidIncrementUpdatedHandler = _minBidIncrement => {
    const minBidIncrement = parseFloat(_minBidIncrement.toString());
    setMinBidIncrement(minBidIncrement);
  };

  const bidWithdrawalLockTimeUpdatedHandler = _lockTime => {
    const lockTime = parseFloat(_lockTime.toString());
    setWithdrawLockTime(lockTime);
  };

  const bidPlacedHandler = (nft, id, bidder, _bid) => {
    if (eventMatches(nft, id)) {
      const bid = parseFloat(_bid.toString()) / 10 ** 18;
      setBid({
        bidder,
        bid,
        lastBidTime: Math.floor(new Date().getTime() / 1000),
      });
    }
  };

  const bidWithdrawnHandler = (nft, id) => {
    if (eventMatches(nft, id)) {
      setBid(null);
    }
  };

  const auctionCancelledHandler = (nft, id) => {
    if (eventMatches(nft, id)) {
      auction.current = null;
      setBid(null);
    }
  };

  const auctionResultedHandler = (nft, id, winner, _winningBid) => {
    if (eventMatches(nft, id)) {
      const newAuction = { ...auction.current, resulted: true };
      auction.current = newAuction;
      setWinner(winner);
      const winningBid = parseFloat(_winningBid.toString()) / 10 ** 18;
      setWinningBid(winningBid);
    }
  };

  const addEventListeners = async () => {
    const salesContract = await getSalesContract();
    const auctionContract = await getAuctionContract();

    salesContract.on('ItemListed', itemListedHandler);
    salesContract.on('ItemUpdated', itemUpdatedHandler);
    salesContract.on('ItemCanceled', itemCanceledHandler);
    salesContract.on('ItemSold', itemSoldHandler);
    salesContract.on('OfferCreated', offerCreatedHandler);
    salesContract.on('OfferCanceled', offerCanceledHandler);

    auctionContract.on('AuctionCreated', auctionCreatedHandler);
    auctionContract.on(
      'UpdateAuctionStartTime',
      auctionStartTimeUpdatedHandler
    );
    auctionContract.on('UpdateAuctionEndTime', auctionEndTimeUpdatedHandler);
    auctionContract.on(
      'UpdateAuctionReservePrice',
      auctionReservePriceUpdatedHandler
    );
    auctionContract.on('UpdateMinBidIncrement', minBidIncrementUpdatedHandler);
    auctionContract.on(
      'UpdateBidWithdrawalLockTime',
      bidWithdrawalLockTimeUpdatedHandler
    );
    auctionContract.on('BidPlaced', bidPlacedHandler);
    auctionContract.on('BidWithdrawn', bidWithdrawnHandler);
    auctionContract.on('AuctionCancelled', auctionCancelledHandler);
    auctionContract.on('AuctionResulted', auctionResultedHandler);
  };

  const removeEventListeners = async () => {
    const salesContract = await getSalesContract();
    const auctionContract = await getAuctionContract();

    salesContract.off('ItemListed', itemListedHandler);
    salesContract.off('ItemUpdated', itemUpdatedHandler);
    salesContract.off('ItemCanceled', itemCanceledHandler);
    salesContract.off('ItemSold', itemSoldHandler);
    salesContract.off('OfferCreated', offerCreatedHandler);
    salesContract.off('OfferCanceled', offerCanceledHandler);

    auctionContract.off('AuctionCreated', auctionCreatedHandler);
    auctionContract.off(
      'UpdateAuctionStartTime',
      auctionStartTimeUpdatedHandler
    );
    auctionContract.off('UpdateAuctionEndTime', auctionEndTimeUpdatedHandler);
    auctionContract.off(
      'UpdateAuctionReservePrice',
      auctionReservePriceUpdatedHandler
    );
    auctionContract.off('UpdateMinBidIncrement', minBidIncrementUpdatedHandler);
    auctionContract.off(
      'UpdateBidWithdrawalLockTime',
      bidWithdrawalLockTimeUpdatedHandler
    );
    auctionContract.off('BidPlaced', bidPlacedHandler);
    auctionContract.off('BidWithdrawn', bidWithdrawnHandler);
    auctionContract.off('AuctionCancelled', auctionCancelledHandler);
    auctionContract.off('AuctionResulted', auctionResultedHandler);
  };

  const getAuctionConfiguration = async () => {
    const contract = await getAuctionContract();

    const _minBidIncrement = await contract.minBidIncrement();
    const minBidIncrement = parseFloat(_minBidIncrement.toString()) / 10 ** 18;
    setMinBidIncrement(minBidIncrement);

    const _lockTime = await contract.bidWithdrawalLockTime();
    const lockTime = parseFloat(_lockTime.toString());
    setWithdrawLockTime(lockTime);
  };

  const getCollection = async () => {
    setCollectionLoading(true);
    try {
      const { data } = await fetchCollection(address);
      setCollection(data);
    } catch (err) {
      console.log(err);
    }
    setCollectionLoading(false);
  };

  useEffect(() => {
    addEventListeners();
    getAuctionConfiguration();
    setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      removeEventListeners();
    };
  }, []);

  useEffect(() => {
    getTokenURI();
    getTokenOwner();
    getItemListings();
    getCurrentOffers();
    getItemTradeHistory();
    getAuctions();
    getBid();

    increaseViewCount(address, tokenID).then(({ data }) => {
      setViews(data);
    });
  }, [address, tokenID]);

  const getSalesContractStatus = async () => {
    const [contract] = await getNFTContract(address);
    try {
      const approved = await contract.isApprovedForAll(
        account,
        SALES_CONTRACT_ADDRESS
      );
      setSalesContractApproved(approved);
    } catch (e) {
      console.log(e);
    }
  };

  const getAuctionContractStatus = async () => {
    const [contract] = await getNFTContract(address);
    try {
      const approved = await contract.isApprovedForAll(
        account,
        AUCTION_CONTRACT_ADDRESS
      );
      setAuctionContractApproved(approved);
    } catch (e) {
      console.log(e);
    }
  };

  const addNFTContractEventListeners = async () => {
    const [contract] = await getNFTContract(address);

    contract.on('ApprovalForAll', (owner, operator, approved) => {
      if (account?.toLowerCase() === owner?.toLowerCase()) {
        if (operator === AUCTION_CONTRACT_ADDRESS) {
          setAuctionContractApproved(approved);
        } else if (operator === SALES_CONTRACT_ADDRESS) {
          setSalesContractApproved(approved);
        }
      }
    });
  };

  useEffect(() => {
    if (account) {
      getSalesContractStatus();
      getAuctionContractStatus();
    }
  }, [address, account]);

  useEffect(() => {
    addNFTContractEventListeners();
    getCollection();
  }, [address]);

  const handleApproveSalesContract = async () => {
    setSalesContractApproving(true);
    try {
      const [contract, provider] = await getNFTContract(address);
      const tx = await contract.setApprovalForAll(SALES_CONTRACT_ADDRESS, true);
      await provider.waitForTransaction(tx.hash);
      setSalesContractApproved(true);
    } catch (e) {
      console.log(e);
    } finally {
      setSalesContractApproving(false);
    }
  };

  const handleApproveAuctionContract = async () => {
    setAuctionContractApproving(true);
    try {
      const [contract, provider] = await getNFTContract(address);
      const tx = await contract.setApprovalForAll(
        AUCTION_CONTRACT_ADDRESS,
        true
      );
      await provider.waitForTransaction(tx.hash);
      setAuctionContractApproved(true);
    } catch (e) {
      console.log(e);
    } finally {
      setAuctionContractApproving(false);
    }
  };

  const isMine = owner?.toLowerCase() === account?.toLowerCase();

  const handleListItem = async _price => {
    if (itemListing) return;

    try {
      setItemListing(true);

      const price = ethers.utils.parseEther(_price);
      const tx = await listItem(
        address,
        ethers.BigNumber.from(tokenID),
        ethers.BigNumber.from(1),
        price,
        ethers.BigNumber.from(Math.floor(new Date().getTime() / 1000)),
        '0x0000000000000000000000000000000000000000'
      );
      await tx.wait();

      toast('success', 'Item listed successfully!');

      setSellModalVisible(false);
      setItemListing(false);
    } catch {
      setItemListing(false);
    }
  };

  const handleUpdatePrice = async _price => {
    if (priceUpdating) return;

    try {
      setPriceUpdating(true);

      const price = ethers.utils.parseEther(_price);
      const tx = await updateListing(address, tokenID, price);
      await tx.wait();

      toast('success', 'Price updated successfully!');

      setPriceUpdating(false);
      setSellModalVisible(false);
    } catch (e) {
      setPriceUpdating(false);
    }
  };

  const cancelList = async () => {
    await cancelListing(address, tokenID);
    listing.current = null;

    toast('success', 'Item unlisted successfully!');
  };

  const handleBuyItem = async _price => {
    const price = ethers.utils.parseEther(_price.toString());
    const tx = await buyItem(
      address,
      ethers.BigNumber.from(tokenID),
      price,
      account
    );

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.waitForTransaction(tx.hash);

    toast('success', 'You have bought the item!');
  };

  const handleMakeOffer = async (_price, endTime) => {
    if (offerPlacing) return;

    try {
      setOfferPlacing(true);
      const price = ethers.utils.parseEther(_price.toString());
      const deadline = Math.floor(endTime.getTime() / 1000);

      const balance = await getWFTMBalance(account);

      if (balance.lt(price)) {
        toast(
          'error',
          'Insufficient WFTM Balance!',
          'You can wrap FTM in the WFTM station.'
        );
        setOfferPlacing(false);
        return;
      }

      const allowance = await getAllowance(account, SALES_CONTRACT_ADDRESS);
      if (allowance.lt(price)) {
        await approve(SALES_CONTRACT_ADDRESS, price);
      }

      const tx = await createOffer(
        address,
        ethers.BigNumber.from(tokenID),
        WFTM_ADDRESS,
        ethers.BigNumber.from(1),
        price,
        ethers.BigNumber.from(deadline)
      );

      await tx.wait();

      setOfferModalVisible(false);

      toast('success', 'Offer placed successfully!');
    } catch (e) {
      console.log(e);
    } finally {
      setOfferPlacing(false);
    }
  };

  const handleAcceptOffer = async offer => {
    if (offerAccepting) return;

    try {
      setOfferAccepting(true);
      const tx = await acceptOffer(address, tokenID, offer.creator);
      await tx.wait();
      setOfferAccepting(false);

      toast('success', 'Offer accepted!');
    } catch {
      setOfferAccepting(false);
    }
  };

  const handleCancelOffer = async () => {
    if (offerCanceling) return;

    try {
      setOfferCanceling(true);

      const tx = await cancelOffer(address, tokenID);
      await tx.wait();

      toast('success', 'You have withdrawn your offer!');

      offerCanceledHandler(account, address, ethers.BigNumber.from(tokenID));

      setOfferCanceling(false);
    } catch {
      setOfferCanceling(false);
    }
  };

  const handleStartAuction = async (_price, _startTime, _endTime) => {
    try {
      setAuctionStarting(true);

      const price = ethers.utils.parseEther(_price);
      const startTime = Math.floor(_startTime.getTime() / 1000);
      const endTime = Math.floor(_endTime.getTime() / 1000);

      const tx = await createAuction(
        address,
        ethers.BigNumber.from(tokenID),
        price,
        ethers.BigNumber.from(startTime),
        ethers.BigNumber.from(endTime)
      );
      await tx.wait();

      toast('success', 'Auction started!');

      setAuctionStarting(false);
      setAuctionModalVisible(false);
    } catch {
      setAuctionStarting(false);
    }
  };

  const handleUpdateAuction = async (_price, _startTime, _endTime) => {
    if (!auction.current) return;

    try {
      setAuctionUpdating(true);

      if (parseFloat(_price) !== auction.current.reservePrice) {
        const price = ethers.utils.parseEther(_price);
        await updateAuctionReservePrice(
          address,
          ethers.BigNumber.from(tokenID),
          ethers.BigNumber.from(price)
        );

        toast('success', 'Auction reserve price updated successfully!');
      }

      const startTime = Math.floor(_startTime.getTime() / 1000);
      if (startTime !== auction.current.startTime) {
        await updateAuctionStartTime(
          address,
          ethers.BigNumber.from(tokenID),
          ethers.BigNumber.from(startTime)
        );

        toast('success', 'Auction start time updated successfully!');
      }

      const endTime = Math.floor(_endTime.getTime() / 1000);
      if (endTime !== auction.current.endTime) {
        await updateAuctionEndTime(
          address,
          ethers.BigNumber.from(tokenID),
          ethers.BigNumber.from(endTime)
        );

        toast('success', 'Auction end time updated successfully!');
      }

      setAuctionUpdating(false);
      setAuctionModalVisible(false);
    } catch {
      setAuctionUpdating(false);
    }
  };

  const cancelCurrentAuction = async () => {
    if (auctionCanceling) return;

    try {
      setAuctionCanceling(true);
      await cancelAuction(address, tokenID);
      auction.current = null;

      toast('success', 'Auction canceled!');
    } catch (err) {
      console.log(err);
    } finally {
      setAuctionCanceling(false);
    }
  };

  const handleResultAuction = async () => {
    if (resulting) return;

    try {
      setResulting(true);
      await resultAuction(address, tokenID);
      setResulting(false);
      setResulted(true);
      toast('success', 'Auction resulted!');
    } catch {
      setResulting(false);
    }
  };

  const handlePlaceBid = async _price => {
    if (bidPlacing) return;

    try {
      setBidPlacing(true);

      const price = ethers.utils.parseEther(_price);
      const tx = await placeBid(
        address,
        ethers.BigNumber.from(tokenID),
        price,
        account
      );
      await tx.wait();

      toast('success', 'Bid placed successfully!');

      setBidPlacing(false);
      setBidModalVisible(false);
    } catch {
      setBidPlacing(false);
    }
  };

  const handleWithdrawBid = async () => {
    if (bidWithdrawing) return;

    try {
      setBidWithdrawing(true);
      await withdrawBid(address, ethers.BigNumber.from(tokenID));
      setBidWithdrawing(false);
      toast('success', 'You have withdrawn your bid!');
    } catch {
      setBidWithdrawing(false);
    }
  };

  const hasMyOffer = useMemo(() => {
    return (
      offers.current.findIndex(
        offer => offer.creator?.toLowerCase() === account?.toLowerCase()
      ) > -1
    );
  }, [offers.current]);

  const series = useMemo(
    () => ({
      showPoints: false,
    }),
    []
  );

  const axes = useMemo(
    () => [
      {
        primary: true,
        type: 'time',
        position: 'bottom',
        show: [true, false],
      },
      { type: 'linear', position: 'left' },
    ],
    []
  );

  const data = tradeHistory.current.map(history => {
    const saleDate = new Date(history.saleDate);
    return {
      primary: saleDate,
      secondary: history.price,
    };
  });

  const formatExpiration = deadline => {
    if (deadline * 1000 < now.getTime()) return 'Expired';

    const duration = new Date(deadline * 1000).getTime() - now.getTime();
    let s = Math.floor(duration / 1000);
    let m = Math.floor(s / 60);
    s %= 60;
    let h = Math.floor(m / 60);
    m %= 60;
    const d = Math.floor(h / 24);
    h %= 24;
    const res = [];
    if (d > 0) {
      res.push(`${d} days`);
    }
    if (d > 0 || h > 0) {
      res.push(`${h} hours`);
    }
    if (d > 0 || h > 0 || m > 0) {
      res.push(`${m} mins`);
    }
    res.push(`${s}s`);
    return res.join(' ');
  };

  const formatDiff = endTime => {
    const diff = endTime - Math.floor(now.getTime() / 1000);
    let m = Math.floor(diff / 60);
    const s = diff % 60;
    let h = Math.floor(m / 60);
    m %= 60;
    const d = Math.floor(h / 24);
    h %= 24;

    if (d) return `${d} days`;
    if (h) return `${h} hours`;
    if (m) return `${m} minutes`;
    return `${s} seconds`;
  };

  const auctionStarted = () =>
    now.getTime() / 1000 >= auction.current?.startTime;

  const auctionEnded = () =>
    auction.current?.endTime <= now.getTime() / 1000 || resulted;

  const auctionActive = () => auctionStarted() && !auctionEnded();

  const canWithdraw = () =>
    bid?.bidder?.toLowerCase() === account?.toLowerCase() &&
    bid?.lastBidTime + withdrawLockTime < now.getTime() / 1000;

  const withdrawWaitTime = () => {
    if (!bid) return '';

    const s = 20 * 60 - Math.floor(now.getTime() / 1000 - bid.lastBidTime);
    if (s <= 0) return '';

    if (s >= 60) {
      return `${Math.ceil(s / 60)} mins`;
    }
    return `${s} seconds`;
  };

  const renderProperties = properties => {
    const res = [];
    Object.keys(properties).map((key, idx) => {
      if (!['address', 'createdAt'].includes(key)) {
        res.push(
          <div key={idx} className={styles.property}>
            <div className={styles.propertyLabel}>{key} : </div>
            <div className={styles.propertyValue}>
              {properties[key]}
              {key === 'royalty' ? '%' : ''}
            </div>
          </div>
        );
      }
    });
    return res;
  };

  return (
    <div
      className={cx(styles.container, isLoggedIn() ? styles.withHeader : '')}
    >
      <Header light />
      {isLoggedIn() && (
        <div className={styles.header}>
          {isMine ? (
            <>
              {auction.current?.resulted === false ? (
                <div
                  className={cx(
                    styles.headerButton,
                    auctionCanceling && styles.disabled
                  )}
                  onClick={cancelCurrentAuction}
                >
                  {auctionCanceling ? 'Canceling Auction...' : 'Cancel Auction'}
                </div>
              ) : null}
              {(!auction.current || !auction.current.resulted) && (
                <div
                  className={styles.headerButton}
                  onClick={() => setAuctionModalVisible(true)}
                >
                  {auction.current ? 'Update Auction' : 'Start Auction'}
                </div>
              )}
              {!auction.current && (
                <>
                  {listing.current ? (
                    <div className={styles.headerButton} onClick={cancelList}>
                      Cancel Listing
                    </div>
                  ) : null}
                  <div
                    className={cx(
                      styles.headerButton,
                      (itemListing || priceUpdating) && styles.disabled
                    )}
                    onClick={() =>
                      !(itemListing || priceUpdating) &&
                      setSellModalVisible(true)
                    }
                  >
                    {listing.current ? 'Update Listing' : 'Sell'}
                  </div>
                </>
              )}
            </>
          ) : (
            !auction.current && (
              <div
                className={cx(
                  styles.headerButton,
                  (offerPlacing || offerCanceling) && styles.disabled
                )}
                onClick={
                  hasMyOffer
                    ? handleCancelOffer
                    : () => setOfferModalVisible(true)
                }
              >
                {hasMyOffer
                  ? offerCanceling
                    ? 'Withdrawing Offer...'
                    : 'Withdraw Offer'
                  : offerPlacing
                  ? 'Making Offer...'
                  : 'Make Offer'}
              </div>
            )
          )}
        </div>
      )}
      <div className={styles.inner}>
        <div className={styles.topContainer}>
          <div className={styles.itemSummary}>
            <div className={styles.itemMedia}>
              <div className={styles.media}>
                {loading ? (
                  <Loader
                    type="Oval"
                    color="#007BFF"
                    height={32}
                    width={32}
                    className={styles.loader}
                  />
                ) : (
                  <Suspense
                    fallback={
                      <Loader
                        type="Oval"
                        color="#007BFF"
                        height={32}
                        width={32}
                        className={styles.loader}
                      />
                    }
                  >
                    <SuspenseImg src={info?.image} />
                  </Suspense>
                )}
              </div>
            </div>
            <div className={styles.itemInfoCont}>
              {info?.properties && (
                <Panel title="Properties">
                  <div className={styles.panelBody}>
                    {renderProperties(info.properties)}
                  </div>
                </Panel>
              )}
              <Panel
                title={
                  <div className={styles.panelTitle}>
                    About&nbsp;
                    {collectionLoading ? (
                      <Skeleton width={80} height={20} />
                    ) : (
                      collection?.collectionName || collection?.name
                    )}
                  </div>
                }
              >
                <div className={styles.panelBody}>
                  <div className={styles.collectionDescription}>
                    {collection?.description || 'Unverified Collection'}
                  </div>

                  <div className={styles.socialLinks}>
                    {collection?.siteUrl?.length > 0 && (
                      <a
                        href={collection?.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.socialLink}
                      >
                        <img src={webIcon} />
                      </a>
                    )}
                    {collection?.twitterHandle?.length > 0 && (
                      <a
                        href={`https://twitter.com/${collection?.twitterHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.socialLink}
                      >
                        <img src={twitterIcon} />
                      </a>
                    )}
                    {collection?.mediumHandle?.length > 0 && (
                      <a
                        href={`https://medium.com/${collection?.mediumHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.socialLink}
                      >
                        <img src={mediumIcon} />
                      </a>
                    )}
                    {collection?.telegram?.length > 0 && (
                      <a
                        href={`https://t.me/${collection?.telegram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.socialLink}
                      >
                        <img src={telegramIcon} />
                      </a>
                    )}
                    {collection?.discord?.length > 0 && (
                      <a
                        href={`https://discord.gg/${collection?.discord}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.socialLink}
                      >
                        <img src={discordIcon} />
                      </a>
                    )}
                  </div>
                </div>
              </Panel>
              <Panel title="Chain Info">
                <div className={styles.panelBody}>
                  <div className={styles.panelLine}>
                    <div className={styles.panelLabel}>Collection</div>
                    <a
                      href={`https://ftmscan.com/token/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.panelValue}
                    >
                      {shortenAddress(address)}
                    </a>
                  </div>
                  <div className={styles.panelLine}>
                    <div className={styles.panelLabel}>Network</div>
                    <div className={styles.panelValue}>Fantom Opera</div>
                  </div>
                  <div className={styles.panelLine}>
                    <div className={styles.panelLabel}>Chain ID</div>
                    <div className={styles.panelValue}>250</div>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
          <div className={styles.itemMain}>
            <div className={styles.wrapper}>
              <div className={styles.itemCategory}>
                {collection?.name || ''}
              </div>
              <div className={styles.itemName}>{info?.name || ''}</div>
              <div className={styles.itemStats}>
                {(ownerInfoLoading || owner || tokenInfo) && (
                  <div className={styles.itemOwner}>
                    {ownerInfoLoading ? (
                      <Skeleton width={180} height={25} />
                    ) : tokenType === 721 ? (
                      <>
                        <div className={styles.ownerAvatar}>
                          {ownerInfo?.imageHash ? (
                            <img
                              src={`https://gateway.pinata.cloud/ipfs/${ownerInfo.imageHash}`}
                              className={styles.avatar}
                            />
                          ) : (
                            <Identicon account={owner} size={24} />
                          )}
                        </div>
                        Owned by&nbsp;
                        <Link
                          to={`/account/${owner}`}
                          className={styles.ownerName}
                        >
                          {isMine
                            ? 'Me'
                            : ownerInfo?.alias || shortenAddress(owner)}
                        </Link>
                      </>
                    ) : (
                      <>
                        <div
                          className={cx(styles.itemViews, styles.clickable)}
                          onClick={() => setOwnersModalVisible(true)}
                        >
                          <PeopleIcon style={styles.itemIcon} />
                          &nbsp;{tokenInfo.holders} owners
                        </div>
                        <div className={styles.itemViews}>
                          <ViewModuleIcon style={styles.itemIcon} />
                          &nbsp;{tokenInfo.totalSupply} total
                        </div>
                      </>
                    )}
                  </div>
                )}
                <div className={styles.itemViews}>
                  <FontAwesomeIcon icon={faEye} color="#00000099" />
                  &nbsp;{views} Views
                </div>
              </div>
            </div>
            {(winner || auction.current?.resulted === false) && (
              <div className={styles.panelWrapper}>
                <Panel
                  title={
                    auctionStarted()
                      ? auctionEnded()
                        ? 'Sale ended'
                        : `Sale ends in ${formatDiff(
                            auction.current.endTime
                          )} (${new Date(
                            auction.current.endTime * 1000
                          ).toLocaleString()})`
                      : `Sale starts in ${formatDiff(
                          auction.current.startTime
                        )}`
                  }
                  fixed
                >
                  <div className={styles.bids}>
                    {auctionEnded() ? (
                      <div className={styles.result}>
                        {auction.current.resulted ? (
                          <>
                            {'Winner: '}
                            <Link to={`/account/${winner}`}>
                              {winner?.toLowerCase() === account?.toLowerCase()
                                ? 'Me'
                                : shortenAddress(winner)}
                            </Link>
                            {` (${winningBid} FTM)`}
                          </>
                        ) : (
                          'Waiting for result'
                        )}
                      </div>
                    ) : bid ? (
                      <div>
                        <div className={styles.bidtitle}>
                          Highest Bid
                          {bid.bid < auction.current.reservePrice
                            ? ' -- Reserve price not met.'
                            : ''}
                        </div>
                        <div className={styles.bidAmount}>{bid.bid} FTM</div>
                      </div>
                    ) : (
                      <div className={styles.bidtitle}>No bids yet</div>
                    )}
                    {!isMine &&
                      auctionActive() &&
                      (bid?.bidder?.toLowerCase() === account?.toLowerCase() ? (
                        <Tooltip
                          title={`You can withdraw bid after ${withdrawWaitTime()}.`}
                          classes={{
                            tooltip: cx(
                              styles.tooltip,
                              withdrawWaitTime().length === 0 && styles.hidden
                            ),
                          }}
                        >
                          <div
                            className={cx(
                              styles.withdrawBid,
                              (!canWithdraw() || bidWithdrawing) &&
                                styles.disabled
                            )}
                            onClick={() => canWithdraw() && handleWithdrawBid()}
                          >
                            {bidWithdrawing
                              ? 'Withdrawing Bid...'
                              : 'Withdraw Bid'}
                          </div>
                        </Tooltip>
                      ) : (
                        <div
                          className={cx(
                            styles.placeBid,
                            bidPlacing && styles.disabled
                          )}
                          onClick={() => setBidModalVisible(true)}
                        >
                          Place Bid
                        </div>
                      ))}
                    {isMine && auctionEnded() && !auction.current.resulted && (
                      <div
                        className={cx(
                          styles.placeBid,
                          resulting && styles.disabled
                        )}
                        onClick={handleResultAuction}
                      >
                        {resulting ? 'Resulting...' : 'Result'}
                      </div>
                    )}
                  </div>
                </Panel>
              </div>
            )}
            <div className={styles.panelWrapper}>
              <Panel title="Price History">
                <div className={styles.chartWrapper}>
                  <ResizableBox width="100%" height={250} resizable={false}>
                    <Chart
                      data={[{ label: 'Price', data }]}
                      series={series}
                      axes={axes}
                      tooltip
                    />
                  </ResizableBox>
                </div>
              </Panel>
            </div>
            <div className={styles.panelWrapper}>
              <Panel title="Listings">
                <div className={styles.listings}>
                  {listing.current && (
                    <div className={cx(styles.listing, styles.heading)}>
                      <div className={styles.owner}>
                        {shortenAddress(listing.current.owner)}
                      </div>
                      <div className={styles.price}>
                        {listing.current.pricePerItem} FTM
                      </div>
                      <div className={styles.buy}>
                        {!isMine && (
                          <div
                            className={styles.buyButton}
                            onClick={() =>
                              handleBuyItem(listing.current.pricePerItem)
                            }
                          >
                            Buy
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Panel>
            </div>
            <div className={styles.panelWrapper}>
              <Panel title="Offers">
                <div className={styles.offers}>
                  <div className={cx(styles.offer, styles.heading)}>
                    <div className={styles.owner}>From</div>
                    <div className={styles.price}>Price</div>
                    <div className={styles.deadline}>Expires In</div>
                    <div className={styles.buy} />
                  </div>
                  {offers.current
                    .filter(offer => offer.deadline * 1000 > now.getTime())
                    .map((offer, idx) => (
                      <div className={styles.offer} key={idx}>
                        <div className={styles.owner}>
                          {shortenAddress(offer.creator)}
                        </div>
                        <div className={styles.price}>
                          {offer.pricePerItem} FTM
                        </div>
                        <div className={styles.deadline}>
                          {formatExpiration(offer.deadline)}
                        </div>
                        <div className={styles.buy}>
                          {isMine && (
                            <div
                              className={cx(
                                styles.buyButton,
                                (salesContractApproving || offerAccepting) &&
                                  styles.disabled
                              )}
                              onClick={
                                salesContractApproved
                                  ? () => handleAcceptOffer(offer)
                                  : handleApproveSalesContract
                              }
                            >
                              {!salesContractApproved ? (
                                salesContractApproving ? (
                                  <ClipLoader color="#FFF" size={16} />
                                ) : (
                                  'Approve'
                                )
                              ) : offerAccepting ? (
                                <ClipLoader color="#FFF" size={16} />
                              ) : (
                                'Accept'
                              )}
                            </div>
                          )}
                          {offer.creator?.toLowerCase() ===
                            account?.toLowerCase() && (
                            <div
                              className={cx(
                                styles.buyButton,
                                offerCanceling && styles.disabled
                              )}
                              onClick={() => handleCancelOffer()}
                            >
                              {offerCanceling ? (
                                <ClipLoader color="#FFF" size={16} />
                              ) : (
                                'Withdraw'
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </Panel>
            </div>
          </div>
        </div>
        <div className={styles.tradeHistoryWrapper}>
          <div className={styles.tradeHistoryHeader}>
            <div className={styles.tradeHistoryTitle}>Trade History</div>
            <div className={styles.filter}>
              <img src={filterIcon} className={styles.filterIcon} />
            </div>
          </div>
          <div className={styles.histories}>
            <div className={cx(styles.history, styles.heading)}>
              <div className={styles.historyPrice}>Price</div>
              <div className={styles.from}>From</div>
              <div className={styles.to}>To</div>
              <div className={styles.saleDate}>Date</div>
            </div>
            {tradeHistory.current.map((history, idx) => {
              const saleDate = new Date(history.saleDate);
              return (
                <div className={styles.history} key={idx}>
                  <div className={styles.historyPrice}>{history.price} FTM</div>
                  <Link to={`/account/${history.from}`} className={styles.from}>
                    {shortenAddress(history.from)}
                  </Link>
                  <Link to={`/account/${history.to}`} className={styles.to}>
                    {shortenAddress(history.to)}
                  </Link>
                  <div className={styles.saleDate}>
                    {saleDate.toUTCString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <SellModal
        visible={sellModalVisible}
        onClose={() => setSellModalVisible(false)}
        onSell={listing.current ? handleUpdatePrice : handleListItem}
        startPrice={listing.current?.pricePerItem || 0}
        confirming={itemListing || priceUpdating}
        approveContract={handleApproveSalesContract}
        contractApproving={salesContractApproving}
        contractApproved={salesContractApproved}
      />
      <OfferModal
        visible={offerModalVisible}
        onClose={() => setOfferModalVisible(false)}
        onMakeOffer={handleMakeOffer}
        confirming={offerPlacing}
        approveContract={handleApproveSalesContract}
        contractApproving={salesContractApproving}
        contractApproved={salesContractApproved}
      />
      <AuctionModal
        visible={auctionModalVisible}
        onClose={() => setAuctionModalVisible(false)}
        onStartAuction={
          auction.current ? handleUpdateAuction : handleStartAuction
        }
        auction={auction.current}
        confirming={auctionStarting || auctionUpdating}
        approveContract={handleApproveAuctionContract}
        contractApproving={auctionContractApproving}
        contractApproved={auctionContractApproved}
      />
      <BidModal
        visible={bidModalVisible}
        onClose={() => setBidModalVisible(false)}
        onPlaceBid={handlePlaceBid}
        minBidAmount={(bid?.bid || 0) + minBidIncrement}
        confirming={bidPlacing}
        approveContract={handleApproveAuctionContract}
        contractApproving={auctionContractApproving}
        contractApproved={auctionContractApproved}
      />
      <OwnersModal
        visible={ownersModalVisible}
        onClose={() => setOwnersModalVisible(false)}
        address={address}
        tokenId={tokenID}
        holdersCount={tokenInfo?.holders || 0}
      />
    </div>
  );
};

export default NFTItem;
