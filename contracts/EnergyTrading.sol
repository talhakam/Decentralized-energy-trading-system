// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract EnergyTrading {
    enum Role { None, Prosumer, Consumer }
    enum TradeStatus { Open, InProgress, Completed, Disputed, Canceled }

    struct User {
        Role role;
        uint reputation;
        uint storedEnergy;
    }

    struct EnergyListing {
        uint id;
        address prosumer;
        uint energyAmount;
        uint minPrice;
        TradeStatus status;
        address highestBidder;
        uint highestBid;
        address secondHighestBidder;
        uint secondHighestBid;
        uint auctionEnd;
        bool isScheduled;
    }

    uint public snipeTimeExtension = 120; // 2 minutes

    mapping(address => User) public users;
    mapping(uint => EnergyListing) public listings;
    mapping(address => uint[]) public prosumerListings;
    mapping(address => uint[]) public userBids;
    uint public listingCount;

    event Registered(address indexed user, Role role);
    event EnergyPosted(uint listingId, address indexed prosumer, uint energyAmount, uint minPrice);
    event BidPlaced(uint listingId, address indexed consumer, uint bidAmount);
    event TradeFinalized(uint listingId, address indexed consumer);
    event EnergyListingEdited(uint listingId, address indexed prosumer, uint energyAmount, uint minPrice, uint auctionEnd);
    event EnergyListingDeleted(uint listingId, address indexed prosumer);

    modifier onlyProsumer() {
        require(users[msg.sender].role == Role.Prosumer, "Not a registered prosumer");
        _;
    }

    modifier onlyConsumer() {
        require(users[msg.sender].role == Role.Consumer, "Not a registered consumer");
        _;
    }

    function registerUser(Role _role) external {
        require(users[msg.sender].role == Role.None, "User already registered");
        users[msg.sender] = User(_role, 0, 0);
        emit Registered(msg.sender, _role);
    }

    function postEnergy(uint _energyAmount, uint _minPrice, uint _auctionDuration) external onlyProsumer {
        listingCount++;
        listings[listingCount] = EnergyListing(
            listingCount,
            msg.sender,
            _energyAmount,
            _minPrice,
            TradeStatus.Open,
            address(0),
            0,
            address(0),
            0,
            block.timestamp + _auctionDuration,
            false
        );
        prosumerListings[msg.sender].push(listingCount);
        emit EnergyPosted(listingCount, msg.sender, _energyAmount, _minPrice);
    }

    function placeBid(uint _listingId) external payable onlyConsumer {
    EnergyListing storage listing = listings[_listingId];
    require(listing.status == TradeStatus.Open, "Listing not open");
    require(block.timestamp < listing.auctionEnd, "Auction ended");
    require(msg.value > 0, "Bid must be greater than 0");
    require(msg.sender != listing.prosumer, "Cannot bid on your own listing");

    if (listing.highestBidder != address(0) && msg.sender == listing.highestBidder) {
        listing.highestBid += msg.value;
    } else {
        if (listing.highestBidder != address(0)) {
            payable(listing.highestBidder).transfer(listing.highestBid);
        }

        listing.secondHighestBidder = listing.highestBidder;
        listing.secondHighestBid = listing.highestBid;

        listing.highestBidder = msg.sender;
        listing.highestBid = msg.value;

        // Ensure the listing ID is only added once to the user's bids
        bool alreadyExists = false;
        for (uint i = 0; i < userBids[msg.sender].length; i++) {
            if (userBids[msg.sender][i] == _listingId) {
                alreadyExists = true;
                break;
            }
        }
        if (!alreadyExists) {
            userBids[msg.sender].push(_listingId);
        }
    }

    if (block.timestamp > listing.auctionEnd - snipeTimeExtension) {
        listing.auctionEnd += snipeTimeExtension;
    }

    emit BidPlaced(_listingId, msg.sender, listing.highestBid);
}


    function finalizeTrade(uint _listingId) external onlyProsumer {
        EnergyListing storage listing = listings[_listingId];
        require(listing.status == TradeStatus.Open, "Trade not open");
        require(listing.highestBidder != address(0), "No bids placed");

        listing.status = TradeStatus.Completed;
        payable(msg.sender).transfer(listing.highestBid);
        emit TradeFinalized(_listingId, listing.highestBidder);
    }

    function editEnergyPost(uint _listingId, uint _energyAmount, uint _minPrice, uint _auctionEnd) external onlyProsumer {
        EnergyListing storage listing = listings[_listingId];
        require(listing.prosumer == msg.sender, "Not the owner of the listing");
        require(listing.status == TradeStatus.Open, "Cannot edit a closed listing");

        listing.energyAmount = _energyAmount;
        listing.minPrice = _minPrice;
        listing.auctionEnd = _auctionEnd;

        emit EnergyListingEdited(_listingId, msg.sender, _energyAmount, _minPrice, _auctionEnd);
    }

    function deleteEnergyPost(uint _listingId) external onlyProsumer {
        EnergyListing storage listing = listings[_listingId];
        require(listing.prosumer == msg.sender, "Not the owner of the listing");
        require(listing.status == TradeStatus.Open, "Cannot delete a closed listing");

        listing.status = TradeStatus.Canceled;

        emit EnergyListingDeleted(_listingId, msg.sender);
    }

    function getAllActiveOffers() external view returns (EnergyListing[] memory) {
        uint activeCount = 0;
        for (uint i = 1; i <= listingCount; i++) {
            if (listings[i].status == TradeStatus.Open) {
                activeCount++;
            }
        }
        EnergyListing[] memory activeListings = new EnergyListing[](activeCount);
        uint index = 0;
        for (uint i = 1; i <= listingCount; i++) {
            if (listings[i].status == TradeStatus.Open) {
                activeListings[index] = listings[i];
                index++;
            }
        }
        return activeListings;
    }

    function getMyPosts(address prosumer) public view returns (EnergyListing[] memory) {
        uint count = 0;
        for (uint i = 0; i < prosumerListings[prosumer].length; i++) {
            uint listingId = prosumerListings[prosumer][i];
            if (listings[listingId].prosumer == prosumer && listings[listingId].status != TradeStatus.Canceled) {
                count++;
            }
        }

        EnergyListing[] memory myListings = new EnergyListing[](count);
        uint index = 0;

        for (uint i = 0; i < prosumerListings[prosumer].length; i++) {
            uint listingId = prosumerListings[prosumer][i];
            if (listings[listingId].prosumer == prosumer && listings[listingId].status != TradeStatus.Canceled) {
                myListings[index] = listings[listingId];
                index++;
            }
        }

        return myListings;
    }

    function getMyBids(address consumer) public view returns (EnergyListing[] memory) {
        uint count = 0;

        // Count valid bids
        for (uint i = 0; i < userBids[consumer].length; i++) {
            uint listingId = userBids[consumer][i];
            if (listingId > 0 && listings[listingId].highestBidder == consumer || listings[listingId].secondHighestBidder == consumer) {
                count++;
            }
        }

        // Create an array to hold the user's bids
        EnergyListing[] memory myBids = new EnergyListing[](count);
        uint index = 0;

        for (uint i = 0; i < userBids[consumer].length; i++) {
            uint listingId = userBids[consumer][i];
            if (listingId > 0 && (listings[listingId].highestBidder == consumer || listings[listingId].secondHighestBidder == consumer)) {
                myBids[index] = listings[listingId];
                index++;
            }
        }

        return myBids;
    }
}