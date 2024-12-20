var findNumbers = function(nums) {
    let sum = 0;
    for (let num of nums) {
        console.log(`Processing number: ${num}`);
        if (num.toString().length % 2 === 0) {
            console.log(`Even number of digits: ${num}`);
            sum++;
        }
    }
    console.log(`Total count of numbers with even digits: ${sum}`);
    return sum;
};

console.log(findNumbers([12, 345, 2, 6, 7896])); // Debug example
