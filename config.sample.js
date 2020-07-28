module.exports = {
    blockchain: {
        tokenAbi: require("./abi/token.json"),
        exchangeAbi: require("./abi/exchange.json"),
        providerType: "websocket",
        providerPath: "wss://mainnetpublicgateway1.fusionnetwork.io:10001",
        chainId: 32659,
        startHeight: 2545943,
        cycle: 100,
        gasPrice: "1", // gwei
        privateKey: "your private key",
        tokenAddress: "0x0c74199D22f732039e843366a236Ff4F61986B32".toLocaleLowerCase(),
        exchangeAddress: "0x049DdC3CD20aC7a2F6C867680F7E21De70ACA9C3".toLocaleLowerCase(),
    },
    charge: 0.004,
    delay: 30
}