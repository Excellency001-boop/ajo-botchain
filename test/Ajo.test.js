const { expect } = require("chai");
const { ethers } = require("hardhat");

// End-to-end proof that a full ajo circle runs correctly: create → join → start →
// contribute every round → each member gets exactly one pot → reputation updates.
describe("Ajo", function () {
  const CONTRIB = ethers.parseEther("1"); // 1 BOT per round
  const ROUND_DURATION = 7 * 24 * 60 * 60; // a week

  async function deploy() {
    const [alice, bob, carol] = await ethers.getSigners();
    const Ajo = await ethers.getContractFactory("Ajo");
    const ajo = await Ajo.deploy();
    await ajo.waitForDeployment();
    return { ajo, alice, bob, carol };
  }

  it("runs a complete 3-member circle and pays everyone once", async function () {
    const { ajo, alice, bob, carol } = await deploy();

    await ajo.connect(alice).createCircle("Ogbomoso Traders", CONTRIB, 3, ROUND_DURATION);
    await ajo.connect(bob).join(0);
    await ajo.connect(carol).join(0);

    await ajo.connect(alice).start(0);

    const members = [alice, bob, carol];
    for (let round = 0; round < 3; round++) {
      const recipient = members[round];
      const before = await ethers.provider.getBalance(recipient.address);

      // Everyone contributes this round.
      for (const m of members) {
        await ajo.connect(m).contribute(0, { value: CONTRIB });
      }

      // Anyone can disburse; use a non-recipient so its gas doesn't touch the recipient.
      const caller = members[(round + 1) % 3];
      await expect(ajo.connect(caller).disburse(0))
        .to.emit(ajo, "PotDisbursed")
        .withArgs(0, round, recipient.address, ethers.parseEther("3")); // pot = 3 × 1 BOT

      // Recipient nets +pot(3) −own contribution(1) = +2 BOT, minus gas for their own
      // contribute tx this round. Assert within a small gas tolerance.
      const after = await ethers.provider.getBalance(recipient.address);
      const delta = after - before;
      expect(delta).to.be.closeTo(ethers.parseEther("2"), ethers.parseEther("0.001"));
    }

    const c = await ajo.getCircle(0);
    expect(c.completed).to.equal(true);

    // Everyone paid on time 3 times.
    for (const m of members) {
      const rep = await ajo.reputationOf(m.address);
      expect(rep.onTime).to.equal(3n);
      expect(rep.payouts).to.equal(1n);
      expect(await ajo.trustScore(m.address)).to.equal(100n);
    }
  });

  it("blocks disburse until the round is fully funded", async function () {
    const { ajo, alice, bob } = await deploy();
    await ajo.connect(alice).createCircle("Duo", CONTRIB, 2, ROUND_DURATION);
    await ajo.connect(bob).join(0);
    await ajo.connect(alice).start(0);

    await ajo.connect(alice).contribute(0, { value: CONTRIB });
    await expect(ajo.connect(alice).disburse(0)).to.be.revertedWithCustomError(ajo, "RoundNotFunded");
  });

  it("rejects wrong contribution amounts and double payment", async function () {
    const { ajo, alice, bob } = await deploy();
    await ajo.connect(alice).createCircle("Duo", CONTRIB, 2, ROUND_DURATION);
    await ajo.connect(bob).join(0);
    await ajo.connect(alice).start(0);

    await expect(
      ajo.connect(alice).contribute(0, { value: ethers.parseEther("0.5") })
    ).to.be.revertedWithCustomError(ajo, "WrongContribution");

    await ajo.connect(alice).contribute(0, { value: CONTRIB });
    await expect(
      ajo.connect(alice).contribute(0, { value: CONTRIB })
    ).to.be.revertedWithCustomError(ajo, "AlreadyContributedThisRound");
  });

  it("only the organizer can start, and only when full", async function () {
    const { ajo, alice, bob, carol } = await deploy();
    await ajo.connect(alice).createCircle("Trio", CONTRIB, 3, ROUND_DURATION);
    await ajo.connect(bob).join(0);

    await expect(ajo.connect(bob).start(0)).to.be.revertedWithCustomError(ajo, "NotOrganizer");
    await expect(ajo.connect(alice).start(0)).to.be.revertedWithCustomError(ajo, "TooFewMembers");

    await ajo.connect(carol).join(0);
    await ajo.connect(alice).start(0);
    expect((await ajo.getCircle(0)).started).to.equal(true);
  });

  it("flags late contributions in reputation", async function () {
    const { ajo, alice, bob } = await deploy();
    await ajo.connect(alice).createCircle("Duo", CONTRIB, 2, 100); // 100s window
    await ajo.connect(bob).join(0);
    await ajo.connect(alice).start(0);

    // Move past the round window, then contribute. Should count as late.
    await ethers.provider.send("evm_increaseTime", [200]);
    await ethers.provider.send("evm_mine", []);

    await ajo.connect(alice).contribute(0, { value: CONTRIB });
    const rep = await ajo.reputationOf(alice.address);
    expect(rep.late).to.equal(1n);
    expect(rep.onTime).to.equal(0n);
  });
});
