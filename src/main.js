import Web3 from "web3"
import { newKitFromWeb3 } from "@celo/contractkit"
import BigNumber from "bignumber.js"
import carAbi from "../contract/car.abi.json"
import erc20Abi from "../contract/erc20.abi.json"

const ERC20_DECIMALS = 18
const CarContractAddress = "0xeE72C330fD750b73EDa06464F506d19E1d6FF5b6"
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"
let kit
let contract
let cars = []

/*
Connecting to the Celo Wallet of the user
  waits for celo to be enabled
  creates a new kit instance which is used to get the users wallet details(i.e address)
  then creates a contract instance using the deployed contracts Abi and Contract Address
*/
const connectCeloWallet = async function () {
  if (window.celo) {
    try {
      notification("⚠️ Please approve this DApp to use it.")
      await window.celo.enable()
      notificationOff()
      const web3 = new Web3(window.celo)
      kit = newKitFromWeb3(web3)

      const accounts = await kit.web3.eth.getAccounts()
      kit.defaultAccount = accounts[0]

      contract = new kit.web3.eth.Contract(carAbi, CarContractAddress)
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
  } else {
    notification("⚠️ Please install the CeloExtensionWallet.")
  }
}

/*
Get User Balance
  gets the users available balance using the getTotalBalance() function passing the users address(that is kit.defaultAccount)
  converts the balance using the ERC20_DECIMALS
  and passes it to the frontend
*/
const getBalance = async function () {
  const totalBalance = await kit.getTotalBalance(kit.defaultAccount)
  const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2)
  document.querySelector("#balance").textContent = cUSDBalance
}

/*
Render Cars Function
  renders the stored cars in the global cars variable
*/
function renderCars() {
  document.getElementById("marketplace").innerHTML = ""
  console.log(cars)
  if (cars.length >= 1) {
    cars.forEach((_product) => {
      if(!_product.isDeleted) {
        const newDiv = document.createElement("div")
        newDiv.className = "col-md-4"
        newDiv.innerHTML = productTemplate(_product)
        document.getElementById("marketplace").appendChild(newDiv)
      }
    })
  }
  else {
    document.getElementById("marketplace").innerHTML = "<h2>No cars available at the moment</h2>"
  }
}

/*
Product Template
  template for displaying the rendered cars
*/
function productTemplate(_product) {
  return `
    <div class="card mb-4">
      <img class="card-img-top" src="${_product.imageUrl}">
      <div class="position-absolute top-0 end-0 bg-warning mt-4 px-2 py-1 rounded-start">
        ${_product.sold} Sold
      </div>
      <div class="card-body text-left p-4 position-relative">
        <div class="translate-middle-y position-absolute top-0">
        ${identiconTemplate(_product.owner)}
        </div>
        <h2 class="card-title fs-4 text-capitalize mt-2">${_product.color} ${_product.name}, ${_product.model}</h2>
        <p class="card-text mt-2">Available: ${_product.available}</p>
        <p class="card-text fs-3 text-danger mt-2">${_product.price.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD</p>
        <div class="d-flex align-items-center justify-content-center gap-2">
          ${cardBtn(_product)}
        </div>
      </div>
    </div>
  `
}

/*
Card Btn
  renders a specific card btn depending on the particular user
  if user is an owner of a car, the delete btn will be rendered
  else the buy btn will be displayed
*/
function cardBtn(_product) {
  if(kit.defaultAccount == _product.owner) {
    if(_product.available > 0) {
      return `
        <button class="btn btn-danger delBtn" style="min-width:100px" id="${_product.index}">
          Delete
        </button>
      `
    }
    else {
      return `
        <button class="btn btn-light" disabled style="min-width:100px" id="${_product.index}">
          Sold out
        </button>
      `
    }
  }
  else {
    if(_product.available > 0) {
      return `
        <button class="btn btn-success buyBtn" style="min-width:100px" id="${_product.index}">
          Buy
        </button>
      `
    }
    else {
      return `
        <button class="btn btn-light" disabled style="min-width:100px" id="${_product.index}">
          Sold out
        </button>
      `
    }
  }
}
function identiconTemplate(_address) {
  const icon = blockies
    .create({
      seed: _address,
      size: 8,
      scale: 16,
    })
    .toDataURL()

  return `
  <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
    <a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
        target="_blank">
        <img src="${icon}" width="48" alt="${_address}">
    </a>
  </div>
  `
}

/*
Notification Function
  functions to display notification to create visually pleasing and a greate ux
*/
function notification(_text) {
  document.querySelector(".alert").style.display = "block"
  document.querySelector("#notification").textContent = _text
}

function notificationOff() {
  document.querySelector(".alert").style.display = "none"
}


/*
Add New Car Function
  adds new cars to the smart contract
  gets all the input values once the add car btn is clicked, converts the price using BigNumber
  stores it in the params array
  calls the uploadCars function from the contract passing the params as the arg
*/
const addNewCar = document.querySelector("#newProductBtn")
addNewCar.addEventListener("click", async (e) => {
  const name = document.querySelector("#newCarName").value
  const model = document.querySelector("#newCarModel").value
  const color = document.querySelector("#newCarColor").value
  const imageUrl = document.querySelector("#newImgUrl").value
  const price = document.querySelector("#newPrice").value
  const available = document.querySelector("#newCarAvailable").value
    const params = [
      name,
      model,
      color,
      imageUrl,
      new BigNumber(price).shiftedBy(ERC20_DECIMALS).toString(),
      available
    ]
    notification(`⌛ Please wait while we add "${params[0]}"...`)

    try {
      const result = await contract.methods
        .uploadCar(...params)
        .send({ from: kit.defaultAccount })
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
    notification(`🎉 You successfully added "${params[0]}".`)
    getCars()
    notificationOff()
  })

/*    
Buy Car Function:
  it checks if the btn clicked has the buy class
  it gets the product index from the id of the buy btn
  next, it approves the transaction
  then calls the buy function from the smart contract using the users account (kit.defaultAccount)
  then it calls the getCars(), getBalance() function to rerender the cars list with new changes
*/
const marketplace = document.querySelector("#marketplace")
marketplace.addEventListener("click", async (e) => {
  if(e.target.className.includes("buyBtn")) {
    const index = e.target.id
    notification("⌛ Waiting for payment approval...")
    try {
      await approve(cars[index].price)
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
    notification(`⌛ Awaiting payment for "${cars[index].name}"...`)
    try {
      const result = await contract.methods
        .buyCar(index)
        .send({ from: kit.defaultAccount })
      notification(`🎉 You successfully bought "${cars[index].name}".`)
      getCars()
      getBalance()
      notificationOff()
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
  }
})


/*
Delete Car
  once the owner clicks on the delete btn
  the deleteCar() of the contract will be called sending the user wallet address as the caller of the function
  after successfully deleting an item, the getCars() is called to rerender the carsr products
  showing on the available products
*/
marketplace.addEventListener("click", async (e) => {
  if(e.target.className.includes("delBtn")) {
    const index = e.target.id

    if(kit.defaultAccount == cars[index].owner) {
      notification(`⌛ Deleting "${cars[index].name}", please wait...`)
      try {
        const result = await contract.methods
          .deleteCar(index)
          .send({ from: kit.defaultAccount })
        notification(`🎉 You have successfully deleted "${cars[index].name}".`)
        getCars()
        notificationOff()
      } catch (error) {
        notification(`⚠️ ${error}.`)
      }
    }
    else {
      notification("Sorry, but only owner can delete this product")
    }
  }
})


/*
Get Cars Function
  gets the length of available cars using the getCarsLength method from the contract and stores it in a varaible
  creates a _cars array
  cycles through the stored cars using a for loop and retrieving each cars details storing it in the newcars variable
  calls the carImage function from the contract to get each cars image url and stores it in the imageUrl variable
  calls the isCarDeleted function and stores it in the isDeleted variable

  pushes each newcars into the _cars array and then pushes everything into the global cars array when all the promises have resolved
*/
const getCars = async function() {
  const _carsLength = await contract.methods.getCarsLength().call()
  const _cars = []
    for (let i = 0; i < _carsLength; i++) {
      let _newcars = new Promise(async (resolve, reject) => {
        let p = await contract.methods.readCars(i).call()
        let imageUrl = await contract.methods.carImage(i).call()
        let isDeleted = await contract.methods.isCarDeleted(i).call()

        resolve({
          index: i,
          owner: p[0],
          name: p[1],
          imageUrl,
          model: p[2],
          color: p[3],
          price: new BigNumber(p[4]),
          sold: p[5],
          available: p[6],
          isDeleted
        })
      })
    _cars.push(_newcars)
    }
  cars = await Promise.all(_cars)
  renderCars()
}

/*
Approve Function
  gets an instance of the contract passing in the ercAbi and the cUSDContractAddress
*/
async function approve(_price) {
  const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress)

  const result = await cUSDContract.methods
    .approve(CarContractAddress, _price)
    .send({ from: kit.defaultAccount })
  return result
}

/*
Runs when the page is loaded
*/
window.addEventListener('load', async () => {
  notification("⌛ Loading...")
  await connectCeloWallet()
  await getBalance()
  await getCars()
  notificationOff()
});
