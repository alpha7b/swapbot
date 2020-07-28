const BigNumber = require("bignumber.js");

const topicTokenPurchase = "0xcd60aa75dea3072fbc07ae6d7d856b5dc5f4eee88854f5b4abf7b680ef8bc50f";
const topicEthPurchase = "0x7f4091b46c33e918a0f3aa42307641d17bb67029427a5369e54b353984238705";

var options = {}
var web3 = null;
var emiter = null;
var currentNumber = 0;
var lastBlockNumber = 0;
var data = null;
var looping = false;

function parseTopics(topics, isBuyToken) {
    var address = "0x" + topics[1].substr(26);
    var fromAmount = new BigNumber(topics[2]);
    var toAmount = new BigNumber(topics[3]);
    return {
        address: address,
        fsnAmount: isBuyToken ? fromAmount : toAmount,
        tokenAmount: isBuyToken ? toAmount : fromAmount
    }
}

function getLogs(number) {
    var ret = {}
    return web3.eth.getBlock(number, true)
        .then(block => {
            ret.blockTime = block.timestamp;
            var ps = [];
            block.transactions.forEach(tx => {
                if (tx.to.toLocaleLowerCase() == options.exchangeAddress) {
                    ps.push(web3.eth.getTransactionReceipt(tx.hash))
                }
            })
            return Promise.all(ps);
        }).then(receipts => {
            var logs = [];
            receipts.forEach(receipt => {
                receipt.logs.forEach(log => {
                    switch (log.topics[0]) {
                        case topicTokenPurchase:
                            logs.push(parseTopics(log.topics, true))
                            break;
                        case topicEthPurchase:
                            logs.push(parseTopics(log.topics, false));
                            break;
                    }
                })
            })
            ret.logs = logs;
            return ret;
        })
}


function calcCycle(number) {
    var cycle = Math.floor((number - options.startHeight) / options.cycle);
    var inCycleIndex = (number - options.startHeight) % 100;
    return {
        cycle: cycle,
        index: inCycleIndex,
        blockNumber: number,
        start: cycle * options.cycle + options.startHeight
    }
}

function loop() {
    looping = true;
    if (currentNumber > lastBlockNumber) {
        emiter.emit("cycle", data);
        looping = false;
        return;
    }
    
    if (currentNumber == 0) {
        currentNumber = calcCycle(lastBlockNumber).start
    }

    var cycle = calcCycle(currentNumber);
    if (cycle.index == 0) {
        data = null;
    }

    getLogs(currentNumber).then(ret => {
        if (data == null) {
            data = {
                total: new BigNumber(0),
                accounts: {},
            };
        }
        data.cycle = cycle;
        data.cycle.blockTime = ret.blockTime;
        ret.logs.forEach(log => {
            if (data.accounts.hasOwnProperty(log.address)) {
                data.accounts[log.address] = data.accounts[log.address].plus(log.fsnAmount);
            } else {
                data.accounts[log.address] = log.fsnAmount
            }
            data.total = data.total.plus(log.fsnAmount);
        })
        currentNumber++;
        loop();
    });
}

module.exports.setOptions = function (_options, _web3, _emiter) {
    options.startHeight = _options.startHeight;
    options.cycle = _options.cycle;
    options.exchangeAddress = _options.exchangeAddress;
    web3 = _web3;
    emiter = _emiter;
}


module.exports.update = function (blockNumber) {
    lastBlockNumber = blockNumber;
    if (!looping) {
        loop();
    }
}