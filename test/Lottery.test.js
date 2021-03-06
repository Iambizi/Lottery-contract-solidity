const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());

const { interface, bytecode } = require('../compile');

let lottery;
let accounts;

beforeEach(async () => {
    // Get a list of all accounts
    accounts = await web3.eth.getAccounts();

    //Deploys instance of our lottery contract
    lottery = await new web3.eth.Contract(JSON.parse(interface))
        .deploy({ data: bytecode })
        .send({ from: accounts[0], gas: '1000000' });
});

describe('Lottery contract', () => {
    it('deploys a contract', () => {
        //check that contract was deployed by validating that address that our 
        // contract was deployed at
        assert.ok(lottery.options.address);
    });

    it('allows one account to enter the lottery', async () => {
        await lottery.methods.enter().send(
            {
                from: accounts[0],
                value: web3.utils.toWei('0.02', 'ether')
            }
        );

        const players = await lottery.methods.getPlayers().call({
            from: accounts[0]
        });

        assert.equal(accounts[0], players[0]);
        assert.equal(1, players.length);
    });

    it('ensure that multiple accounts can enter', async () => {
        await lottery.methods.enter().send(
            {
                from: accounts[0],
                value: web3.utils.toWei('0.02', 'ether')
            }
        );
        await lottery.methods.enter().send(
            {
                from: accounts[1],
                value: web3.utils.toWei('0.02', 'ether')
            }
        );
        await lottery.methods.enter().send(
            {
                from: accounts[2],
                value: web3.utils.toWei('0.02', 'ether')
            }
        );

        const players = await lottery.methods.getPlayers().call({
            from: accounts[0]
        });

        assert.equal(accounts[0], players[0]);
        assert.equal(accounts[1], players[1]);
        assert.equal(accounts[2], players[2]);
        assert.equal(3, players.length);
    });

    it('requires a minimum amount of ether to enter', async () => {
        //Use try catch statement to make sure we get an error when
        //sending insufficient funds to enter lottery
        try {
            await lottery.methods.enter().send({
                from: accounts[0],
                value: 0
            });
            assert(false);
        } catch (err) {
            assert(err);
        }
    });

    it('only a manager can call pickWinner', async () => {
        try {
            await lottery.methods.pickWinner().send({
                from: accounts[1],
                value: web3.utils.toWei('0.02', 'ether')
            });
            assert(false);
        } catch (err) {
            assert(err);
        }
    });

    it('sends money to enter the winner and resets the players array', async () => {
        await lottery.methods.enter().send({
            from: accounts[0],
            value: web3.utils.toWei('1', 'ether')
        });
        // We will track the balance of the player before entering and after entering
        // This is how we will that our player is indeed the winner

        //getBalance will return the amount of ether in units of wei that a given account controls
        const initialBalance = await web3.eth.getBalance(accounts[0]);

        await lottery.methods.pickWinner().send({
            from: accounts[0]
        });

        const finalBalance = await web3.eth.getBalance(accounts[0]);

        const difference = finalBalance - initialBalance;

        assert(difference > web3.utils.toWei('0.02', 'ether'));
    });
});