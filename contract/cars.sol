// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
  function transfer(address, uint256) external returns (bool);
  function approve(address, uint256) external returns (bool);
  function transferFrom(address, address, uint256) external returns (bool);
  function totalSupply() external view returns (uint256);
  function balanceOf(address) external view returns (uint256);
  function allowance(address, address) external view returns (uint256);

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract Cars {

    uint256 internal length = 0;
    address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

    struct Car {
        address payable owner;
        string name;
        string model;
        string color;
        string image;
        uint256 price;
        uint256 sold;
        uint256 available;
        bool is_deleted;
    }

    mapping(uint256 => mapping(address => uint256)) boughtCars;
    mapping(uint256 => Car) internal cars;

    modifier onlyOwner(uint256 _index) {
        require(msg.sender == cars[_index].owner, "Only the owner can acess this functionality");
        _;
    }

/*
Upload Car Function
    takes in the car's name, model, color, imageUrl, price and number available
    passes the number sold to 0 and is_deleted to false
    creates a new car with the length of cars stored as the key and the passed parameters
    as the values for the Car struct defined
*/
    function uploadCar(
        string memory _car_name,
        string memory _car_model,
        string memory _car_color,
        string memory _car_image,
        uint256 _car_price,
        uint256 _num_available
    ) public {
        uint256 _num_sold = 0;
        bool _is_deleted = false;

        cars[length] = Car(
            payable(msg.sender),
            _car_name,
            _car_model,
            _car_color,
            _car_image,
            _car_price,
            _num_sold,
            _num_available,
            _is_deleted
        );
        length++;
    }

/*
Car Image
    a function to get the uploaded car imageUrl
    it takes an index as its arg to get a particular car
*/
    function carImage(uint256 _index) public view returns (string memory) {
        return cars[_index].image;
    }

/*
Read Cars
    function to read the available/stored cars
    it takes an index as the arg and returns the info of the corresponding car
    from the passes index
*/
    function readCars(uint256 _index) public view returns (
        address payable,
        string memory,
        string memory, 
        string memory,
        uint256,
        uint256,
        uint256
    ) {
        return (
            cars[_index].owner,
            cars[_index].name,
            cars[_index].model,
            cars[_index].color,
            cars[_index].price,
            cars[_index].sold,
            cars[_index].available
        );
    }
    
/*
Buy Car Function
    function to buy a particular car
    it takes an index as the arg to get the particular car
    it requires the caller of the function to not be the owner of the car
    it requires that the car must be available and should not be deleted
    it requires the IERC20Token which transfers the money from the caller of the function
    to the owner of the car. It returns "transaction failed" if this is transaction is not possible
    it increments the number of cars sold and decreases the number of available cars by 1
*/
    function buyCar(uint256 _index, uint256 _quantity) public payable  {
        Car storage car = cars[_index];
        require(msg.sender != car.owner, "Owner can't buy their own car");
        require(car.available >= _quantity, "Not sufficient car available" );
        require(!car.is_deleted, "Sorry buy this Car has been deleted");
        require(
          IERC20Token(cUsdTokenAddress).transferFrom(
            msg.sender,
            car.owner,
            car.price * _quantity
          ),
          "Transfer failed."
        );
        cars[_index].sold += _quantity;
        cars[_index].available -= _quantity;
        boughtCars[_index][msg.sender] += _quantity;
    }

/*
ReturnCar
    User returns the product to the owner
*/

    function returnCar(uint256 _index, uint256 _quantity) public {
        require(boughtCars[_index][msg.sender] >= _quantity, "You can only return cars you bought");
        cars[_index].available += _quantity;
        boughtCars[_index][msg.sender] -= _quantity;
    }

/*
Delete Car
    deletes a particular car using the index
    it is not a true delete but it changes the is_deleted property of the car to true
    hence making the car unavailable for purchase
*/
    function deleteCar(uint256 _index) public onlyOwner(_index) {
        cars[_index].is_deleted = true;
    }

/*
Change price
    Changes the price of the car
*/
    function changePrice(uint256 _index, uint256 _price) public onlyOwner(_index){
        cars[_index].price = _price;
    }

/*
Add stock
    Adds to the inventory
*/
    function addStock(uint256 _index, uint256 _cars) public onlyOwner(_index){
        cars[_index].available += _cars;
    }

/*
This function checks if a particular car has been deleted
it takes in an index as its arg and uses it to get access to a particular car
it returns the value of the car's is_deleted property
it returns true if the car is deleted and false if it is not
*/
    function isCarDeleted(uint256 _index) public view returns (bool) {
        return (cars[_index].is_deleted);
    }

/*
Cars Length
    gets the length of stored cars in the cars mapping
    it returns an interger
*/
    function getCarsLength() public view returns (uint256) {
        return (length);
    }
}
