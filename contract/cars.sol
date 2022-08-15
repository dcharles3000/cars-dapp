// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
    function transfer(address, uint256) external returns (bool);

    function approve(address, uint256) external returns (bool);

    function transferFrom(
        address,
        address,
        uint256
    ) external returns (bool);

    function totalSupply() external view returns (uint256);

    function balanceOf(address) external view returns (uint256);

    function allowance(address, address) external view returns (uint256);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

contract Cars {
    uint256 internal length = 0;
    address internal cUsdTokenAddress =
        0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

    struct Car {
        address payable owner;
        string car_name;
        string car_model;
        string car_color;
        string car_image;
        uint256 car_price;
        uint256 num_sold;
        uint256 num_available;
    }

    mapping(uint256 => Car) private cars;
    mapping(uint256 => bool) private deleted;

    modifier checkDeleted(uint _index) {
        require(!deleted[_index], "Car has been removed from the platform");
        _;
    }

    modifier onlyCarOwner(uint _index) {
        require(msg.sender == cars[_index].owner, "Invalid owner");
        _;
    }

    /**
    @dev Upload Car Function
    @notice takes in the car's name, model, color, imageUrl, price and number available
            passes the number sold to 0 and is_deleted to false
            creates a new car with the length of cars stored as the key and the passed parameters
            as the values for the Car struct defined
    */
    function uploadCar(
        string calldata _car_name,
        string calldata _car_model,
        string calldata _car_color,
        string calldata _car_image,
        uint256 _car_price,
        uint256 _num_available
    ) public {
        require(_num_available > 0, "Number available must at least be one");
        require(bytes(_car_image).length > 0, "Empty image url");
        require(bytes(_car_model).length > 0, "Empty car model");
        require(bytes(_car_name).length > 0, "Empty car name");
        uint256 _num_sold = 0;
        deleted[length] = false;
        cars[length] = Car(
            payable(msg.sender),
            _car_name,
            _car_model,
            _car_color,
            _car_image,
            _car_price,
            _num_sold,
            _num_available
        );
        length++;
    }

    /**
     *  @dev Read Cars
            function to read the available/stored cars
        @return it takes an index as the arg and returns the info of the corresponding car
            from the passes index
*/
    function readCars(uint256 _index)
        public
        view
        checkDeleted(_index)
        returns (Car memory)
    {
        return (cars[_index]);
    }

    /**
    * @dev Buy Car Function
        function to buy a particular car
    *  @notice    it takes an index as the arg to get the particular car
    *  @notice    it requires the caller of the function to not be the owner of the car
    *  @notice    it requires that the car must be available and should not be deleted
    *  @notice    it requires the IERC20Token which transfers the money from the caller of the function
                to the owner of the car. It returns "transaction failed" if this is transaction is not possible
    *  @notice    it increments the number of cars sold and decreases the number of available cars by 1
*/
    function buyCar(uint256 _index) public payable checkDeleted(_index) {
        require(
            msg.sender != cars[_index].owner,
            "Owner can't buy their own car"
        );
        require(cars[_index].num_available > 0, "No cars available for sale");
        require(
            IERC20Token(cUsdTokenAddress).transferFrom(
                msg.sender,
                cars[_index].owner,
                cars[_index].car_price
            ),
            "Transfer failed."
        );
        cars[_index].num_sold++;
        cars[_index].num_available--;
    }

    /**
     * @dev Delete Car
     * @notice deletes a particular car using the index
     */
    function deleteCar(uint256 _index)
        public
        checkDeleted(_index)
        onlyCarOwner(_index)
    {
        deleted[_index] = true;
        delete cars[_index];
    }

    function reStockCars(uint _index, uint amount)
        public
        checkDeleted(_index)
        onlyCarOwner(_index)
    {
        require(amount > 0, "Restocking amount has to be atleast one");
        cars[_index].num_available += amount;
    }

    /**
    @dev This function checks if a particular car has been deleted
        it takes in an index as its arg and uses it to get access to a particular car
        it returns the value of the car's deleted property
        it returns true if the car is deleted and false if it is not
*/
    function isCarDeleted(uint256 _index) public view returns (bool) {
        return (deleted[_index]);
    }

    /**
    @dev gets the length of stored cars in the cars mapping
    @return it returns an interger
    */
    function getCarsLength() public view returns (uint256) {
        return (length);
    }
}
