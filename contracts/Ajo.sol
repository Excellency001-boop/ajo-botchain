// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Ajo. On-chain thrift circles (ajo / esusu / adashe) for BOT Chain
/// @notice A trustless version of the West-African rotating savings circle. A group
///         of members each contribute a fixed amount every round; every round the
///         whole pot is paid out to one member in turn, until everyone has been paid
///         once. No treasurer holds the money. The contract does. On-time payments
///         build an on-chain reputation that follows the member to future circles.
/// @dev    Single-contract registry: many circles live in one deployment as structs,
///         which keeps deployment cheap and the demo easy to reason about. Native BOT
///         is used for contributions so members never need a token approval step.
contract Ajo {
    // ----------------------------------------------------------------------
    // Errors. Cheaper than require strings and easier to test against.
    // ----------------------------------------------------------------------
    error NotOrganizer();
    error CircleFull();
    error AlreadyMember();
    error NotMember();
    error AlreadyStarted();
    error NotStarted();
    error AlreadyCompleted();
    error WrongContribution();
    error AlreadyContributedThisRound();
    error RoundNotFunded();
    error TooFewMembers();
    error TransferFailed();
    error Reentrancy();

    // ----------------------------------------------------------------------
    // Types
    // ----------------------------------------------------------------------
    struct Circle {
        address organizer;      // who created the circle
        string  name;           // human label, e.g. "Ogbomoso Traders Ajo"
        uint256 contribution;   // amount each member pays per round (wei of BOT)
        uint256 maxMembers;     // circle size; also the number of rounds
        uint256 roundDuration;  // seconds a round stays "on time" after it starts
        uint256 currentRound;   // 0-indexed; members[currentRound] is this round's recipient
        uint256 roundStart;     // timestamp the current round opened
        bool    started;        // organizer has locked membership and begun round 0
        bool    completed;      // every member has received the pot once
    }

    /// @notice Reputation is global, not per-circle. That is the whole point. A member's
    ///         track record travels with them.
    struct Reputation {
        uint64 onTime;   // contributions made inside the round window
        uint64 late;     // contributions made after the window (still counts, but flagged)
        uint64 circles;  // circles joined
        uint64 payouts;  // times this member has received a pot
    }

    // ----------------------------------------------------------------------
    // Storage
    // ----------------------------------------------------------------------
    uint256 public circleCount;
    mapping(uint256 => Circle) private _circles;
    mapping(uint256 => address[]) private _members;                          // circleId => members (payout order)
    mapping(uint256 => mapping(address => bool)) public isMember;            // circleId => member => joined?
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public contributed; // circleId => round => member => paid?
    mapping(uint256 => mapping(uint256 => uint256)) public roundPaidCount;   // circleId => round => how many paid
    mapping(address => Reputation) public reputationOf;

    uint256 private _lock = 1; // minimal reentrancy guard (1 = open, 2 = entered)

    // ----------------------------------------------------------------------
    // Events. The frontend and the AI agent read the chain purely from these.
    // ----------------------------------------------------------------------
    event CircleCreated(uint256 indexed circleId, address indexed organizer, string name, uint256 contribution, uint256 maxMembers, uint256 roundDuration);
    event MemberJoined(uint256 indexed circleId, address indexed member, uint256 position);
    event CircleStarted(uint256 indexed circleId, uint256 roundStart);
    event Contributed(uint256 indexed circleId, uint256 indexed round, address indexed member, bool onTime);
    event PotDisbursed(uint256 indexed circleId, uint256 indexed round, address indexed recipient, uint256 amount);
    event CircleCompleted(uint256 indexed circleId);

    // ----------------------------------------------------------------------
    // Modifiers
    // ----------------------------------------------------------------------
    modifier nonReentrant() {
        if (_lock == 2) revert Reentrancy();
        _lock = 2;
        _;
        _lock = 1;
    }

    // ----------------------------------------------------------------------
    // Circle lifecycle
    // ----------------------------------------------------------------------

    /// @notice Create a new circle and auto-join the organizer as the first member.
    /// @param name           human label for the circle
    /// @param contribution   amount (in wei of BOT) each member pays every round
    /// @param maxMembers     number of members = number of rounds (min 2)
    /// @param roundDuration  seconds a round is considered "on time"
    function createCircle(
        string calldata name,
        uint256 contribution,
        uint256 maxMembers,
        uint256 roundDuration
    ) external returns (uint256 circleId) {
        if (maxMembers < 2) revert TooFewMembers();
        if (contribution == 0) revert WrongContribution();

        circleId = circleCount++;
        Circle storage c = _circles[circleId];
        c.organizer = msg.sender;
        c.name = name;
        c.contribution = contribution;
        c.maxMembers = maxMembers;
        c.roundDuration = roundDuration;

        emit CircleCreated(circleId, msg.sender, name, contribution, maxMembers, roundDuration);
        _join(circleId, msg.sender);
    }

    /// @notice Join an existing circle before it starts.
    function join(uint256 circleId) external {
        Circle storage c = _circles[circleId];
        if (c.started) revert AlreadyStarted();
        if (_members[circleId].length >= c.maxMembers) revert CircleFull();
        _join(circleId, msg.sender);
    }

    function _join(uint256 circleId, address who) private {
        if (isMember[circleId][who]) revert AlreadyMember();
        isMember[circleId][who] = true;
        _members[circleId].push(who);
        reputationOf[who].circles += 1;
        emit MemberJoined(circleId, who, _members[circleId].length - 1);
    }

    /// @notice Organizer locks membership and opens round 0. Membership must be full.
    /// @dev We require a full circle so the payout math (pot = contribution * members)
    ///      is fixed and every member is guaranteed exactly one payout.
    function start(uint256 circleId) external {
        Circle storage c = _circles[circleId];
        if (msg.sender != c.organizer) revert NotOrganizer();
        if (c.started) revert AlreadyStarted();
        if (_members[circleId].length != c.maxMembers) revert TooFewMembers();
        c.started = true;
        c.roundStart = block.timestamp;
        emit CircleStarted(circleId, block.timestamp);
    }

    /// @notice Pay this round's contribution. Reverts if you already paid this round.
    function contribute(uint256 circleId) external payable {
        Circle storage c = _circles[circleId];
        if (!c.started) revert NotStarted();
        if (c.completed) revert AlreadyCompleted();
        if (!isMember[circleId][msg.sender]) revert NotMember();
        if (msg.value != c.contribution) revert WrongContribution();

        uint256 round = c.currentRound;
        if (contributed[circleId][round][msg.sender]) revert AlreadyContributedThisRound();

        contributed[circleId][round][msg.sender] = true;
        roundPaidCount[circleId][round] += 1;

        bool onTime = block.timestamp <= c.roundStart + c.roundDuration;
        if (onTime) reputationOf[msg.sender].onTime += 1;
        else reputationOf[msg.sender].late += 1;

        emit Contributed(circleId, round, msg.sender, onTime);
    }

    /// @notice Once every member has funded the current round, send the whole pot to
    ///         the round's recipient and advance to the next round. Callable by anyone
    ///         (the AI agent calls this automatically), so no member can stall a payout.
    function disburse(uint256 circleId) external nonReentrant {
        Circle storage c = _circles[circleId];
        if (!c.started) revert NotStarted();
        if (c.completed) revert AlreadyCompleted();

        uint256 round = c.currentRound;
        uint256 count = _members[circleId].length;
        if (roundPaidCount[circleId][round] != count) revert RoundNotFunded();

        address recipient = _members[circleId][round];
        uint256 amount = c.contribution * count;

        reputationOf[recipient].payouts += 1;

        // Advance state BEFORE the external call (checks-effects-interactions).
        if (round + 1 == c.maxMembers) {
            c.completed = true;
            emit CircleCompleted(circleId);
        } else {
            c.currentRound = round + 1;
            c.roundStart = block.timestamp;
        }

        emit PotDisbursed(circleId, round, recipient, amount);

        (bool ok, ) = payable(recipient).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    // ----------------------------------------------------------------------
    // Views. Everything the app and agent need in as few calls as possible.
    // ----------------------------------------------------------------------

    function getCircle(uint256 circleId)
        external
        view
        returns (
            address organizer,
            string memory name,
            uint256 contribution,
            uint256 maxMembers,
            uint256 roundDuration,
            uint256 currentRound,
            uint256 roundStart,
            bool started,
            bool completed,
            uint256 memberCount
        )
    {
        Circle storage c = _circles[circleId];
        return (
            c.organizer,
            c.name,
            c.contribution,
            c.maxMembers,
            c.roundDuration,
            c.currentRound,
            c.roundStart,
            c.started,
            c.completed,
            _members[circleId].length
        );
    }

    function getMembers(uint256 circleId) external view returns (address[] memory) {
        return _members[circleId];
    }

    /// @notice This round's recipient (the member whose "hand" it is).
    function currentRecipient(uint256 circleId) external view returns (address) {
        Circle storage c = _circles[circleId];
        if (_members[circleId].length == 0) return address(0);
        return _members[circleId][c.currentRound];
    }

    /// @notice How many members have funded the current round, and the size of the pot.
    function roundStatus(uint256 circleId)
        external
        view
        returns (uint256 round, uint256 funded, uint256 total, uint256 potIfComplete)
    {
        Circle storage c = _circles[circleId];
        round = c.currentRound;
        total = _members[circleId].length;
        funded = roundPaidCount[circleId][round];
        potIfComplete = c.contribution * total;
    }

    /// @notice A single 0–100 trust score derived from a member's payment history.
    /// @dev    Pure convenience for the UI/agent; the raw counts remain the source of truth.
    function trustScore(address who) external view returns (uint256) {
        Reputation memory r = reputationOf[who];
        uint256 totalPaid = uint256(r.onTime) + uint256(r.late);
        if (totalPaid == 0) return 50; // neutral for newcomers
        return (uint256(r.onTime) * 100) / totalPaid;
    }
}
