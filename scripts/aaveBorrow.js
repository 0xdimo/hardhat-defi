const { getWeth } = require("../scripts/getWeth")

async function main() {
    await getWeth()
    
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.log(error)
        process.exit(1)
    })
