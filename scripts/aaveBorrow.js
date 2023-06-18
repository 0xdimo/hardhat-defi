const { getNamedAccounts } = require("hardhat")
const { getWeth, AMOUNT } = require("../scripts/getWeth")

async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()
    //Lending pool address Provider (Goerli): ​ 0xb53c1a33016b2dc2ff3653530bff1848a515c8c5
    const lendingPool = await getLendingPool(deployer)
    console.log(`LendingPool address ${lendingPool.address}`)

    //deposit
    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    //approve
    await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer)
    console.log("Depositing...")
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0)
    console.log("Deposited!!!")

    let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(lendingPool, deployer)
    console.log(`******************************** ${totalDebtETH}`)
    const daiPriceInEth = await getDaiPrice()
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPriceInEth.toNumber())

    const amountDaiToBorrowInWei = ethers.utils.parseEther(amountDaiToBorrow.toString())
    await borrowDai(
        "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        lendingPool,
        amountDaiToBorrowInWei,
        deployer
    )

    await getBorrowUserData(lendingPool, deployer)
}

async function repay(amount, daiAddress, lendingPool, account) {
    await approveErc20(daiAddress, lendingPool.address, amount, account)
    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
    await repayTx.wait(1)
    console.log("Repayed!!!")
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrowInWei, account) {
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrowInWei, 1, 0, account)
    await borrowTx.wait(1)
    console.log("You've borrowed!")
}

async function getDaiPrice() {
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616e4d11a78f511299002da57a0a94577f1f4"
    ) // no need of third argument account, because we won't sign anything
    const { answer } = await daiEthPriceFeed.latestRoundData()
    console.log(`The DAI/ETH price is ${answer.toString()}`)
    return answer
}

async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account)
    console.log(`ETH Deposited: ${totalCollateralETH} ETH`)
    console.log(`ETH Borrowed:  ${totalDebtETH} ETH`)
    console.log(`Available ETH to borrow: ${availableBorrowsETH} ETH`)
    return { availableBorrowsETH, totalDebtETH }
}

//You must approve token before deposit
//We are approving the spender address to withdraw amountToSpend from our account
async function approveErc20(erc20Address, spenderAddress, amountToSpend, account) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account)
    const tx = await erc20Token.approve(spenderAddress, amountToSpend)
    await tx.wait(1)
    console.log("Approved!")
}

async function getLendingPool(account) {
    const lendingPoolAddressProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0xb53c1a33016b2dc2ff3653530bff1848a515c8c5",
        account
    )
    const lendingPoolAddress = await lendingPoolAddressProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account)
    return lendingPool
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.log(error)
        process.exit(1)
    })
