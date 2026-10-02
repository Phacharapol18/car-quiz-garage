// Question bank. Each run draws a shuffled subset, and answer order is shuffled too.
// `answer` is the index of the correct choice in `choices`.
const QUESTIONS = [
  // ---- Brands ----
  { cat: 'brands', q: "Which car company uses the tagline 'The Ultimate Driving Machine'?", choices: ['Audi', 'BMW', 'Honda', 'Toyota'], answer: 1, fact: 'BMW has used the slogan in the US since 1974.' },
  { cat: 'brands', q: 'Which company makes the 911 sports car?', choices: ['Porsche', 'Ferrari', 'Jaguar', 'Aston Martin'], answer: 0, fact: 'The 911 first went on sale in 1964 and has kept its rear-engine layout ever since.' },
  { cat: 'brands', q: 'A prancing horse is the logo of which brand?', choices: ['Lamborghini', 'Maserati', 'Ferrari', 'Alfa Romeo'], answer: 2, fact: "The horse came from WWI fighter pilot Francesco Baracca's plane." },
  { cat: 'brands', q: 'A charging bull is the logo of which brand?', choices: ['Bugatti', 'Lamborghini', 'Pagani', 'Dodge'], answer: 1, fact: "Ferruccio Lamborghini was a Taurus, and he loved bullfighting." },
  { cat: 'brands', q: 'Which brand uses four interlocking rings as its logo?', choices: ['Audi', 'Opel', 'Volkswagen', 'Skoda'], answer: 0, fact: 'The rings stand for the four companies that merged into Auto Union in 1932.' },
  { cat: 'brands', q: 'The stars in the Subaru logo depict which star cluster?', choices: ['Orion', 'The Big Dipper', 'Pleiades', 'Southern Cross'], answer: 2, fact: '"Subaru" is the Japanese name for the Pleiades.' },
  { cat: 'brands', q: 'What car manufacturer makes the Altima?', choices: ['Mazda', 'Nissan', 'Mercedes', 'Ford'], answer: 1, fact: 'The Altima became its own model in 1993.' },
  { cat: 'brands', q: 'What car company launched the rotary-engined RX-8?', choices: ['Mazda', 'BMW', 'Mercedes', 'Toyota'], answer: 0, fact: 'The RX-8 used a Wankel rotary engine instead of pistons.' },
  { cat: 'brands', q: 'Which country does Volvo come from?', choices: ['Norway', 'Germany', 'Sweden', 'Denmark'], answer: 2, fact: 'Volvo comes from the Latin for "I roll".' },
  { cat: 'brands', q: 'Hyundai is headquartered in which country?', choices: ['Japan', 'South Korea', 'China', 'Taiwan'], answer: 1, fact: 'Hyundai means "modernity" in Korean.' },
  { cat: 'brands', q: 'What does "Volkswagen" mean in English?', choices: ["People's car", 'Fast wagon', 'Folk machine', 'Wolf car'], answer: 0, fact: 'The original Beetle was designed to be affordable for ordinary families.' },
  { cat: 'brands', q: 'Which brand makes the Corvette?', choices: ['Ford', 'Dodge', 'Chevrolet', 'Pontiac'], answer: 2, fact: 'The first Corvette came out in 1953, and only 300 were built that year.' },
  { cat: 'brands', q: 'Which carmaker has owned the MINI brand since 2000?', choices: ['Volkswagen', 'BMW', 'Tata', 'Stellantis'], answer: 1, fact: 'The first BMW-built MINI arrived in 2001.' },

  // ---- Mechanics ----
  { cat: 'mechanics', q: 'Which of these is NOT a system within a car?', choices: ['Fuel', 'Yaw', 'Exhaust', 'Transmission'], answer: 1, fact: 'Yaw is rotation around the vertical axis, a motion, not a system.' },
  { cat: 'mechanics', q: 'Wheel "alignment" is part of which system?', choices: ['Fuel', 'Cooling', 'Exhaust', 'Steering & suspension'], answer: 3, fact: 'Bad alignment wears tires unevenly and makes the car pull to one side.' },
  { cat: 'mechanics', q: 'Most modern gasoline cars use a ____-stroke engine.', choices: ['2', '3', '6', '4'], answer: 3, fact: 'The four strokes are intake, compression, power, and exhaust.' },
  { cat: 'mechanics', q: 'Where does the four-stroke cycle take place?', choices: ['In the carburetor', 'In the cylinders', 'In the radiator', 'In the starter'], answer: 1, fact: 'Each piston completes the cycle inside its own cylinder.' },
  { cat: 'mechanics', q: "What fluid is mixed with water to protect an engine's cooling system?", choices: ['Motor oil', 'Washer fluid', 'Antifreeze', 'Brake fluid'], answer: 2, fact: 'Antifreeze lowers the freezing point and raises the boiling point of the coolant.' },
  { cat: 'mechanics', q: 'What does ABS stand for?', choices: ['Automatic Brake Support', 'Anti-lock Braking System', 'Active Balance Stabilizer', 'Assisted Braking Sensor'], answer: 1, fact: 'ABS keeps the wheels from locking, so you can still steer while braking hard.' },
  { cat: 'mechanics', q: 'Which part turns the pistons\' up-and-down motion into rotation?', choices: ['Camshaft', 'Crankshaft', 'Driveshaft', 'Flywheel'], answer: 1, fact: 'The crankshaft works much like the pedals on a bicycle.' },
  { cat: 'mechanics', q: 'What spins the turbine of a turbocharger?', choices: ['A belt from the crankshaft', 'An electric motor', 'Exhaust gases', 'The alternator'], answer: 2, fact: 'A belt-driven compressor is a supercharger, not a turbo.' },
  { cat: 'mechanics', q: 'How does a diesel engine ignite its fuel?', choices: ['Spark plugs', 'Heat from compression', 'Glow from the exhaust', 'A pilot flame'], answer: 1, fact: 'Diesels compress air so hard that it gets hot enough to ignite the fuel.' },
  { cat: 'mechanics', q: 'What is the main job of a catalytic converter?', choices: ['Boost horsepower', 'Cool the exhaust', 'Reduce harmful emissions', 'Quiet the engine'], answer: 2, fact: 'Precious metals like platinum and rhodium drive the chemical reactions.' },
  { cat: 'mechanics', q: 'What does an octane rating measure?', choices: ['Energy content', 'Resistance to knocking', 'Fuel purity', 'Burn temperature'], answer: 1, fact: 'Higher octane fuel resists igniting too early under compression.' },
  { cat: 'mechanics', q: 'What does the clutch do in a manual car?', choices: ['Slows the wheels', 'Connects and disconnects the engine from the gearbox', 'Charges the battery', 'Adjusts the fuel mixture'], answer: 1, fact: 'Pressing the pedal disengages the clutch so you can change gears.' },
  { cat: 'mechanics', q: 'On a tire marked 205/55 R16, what does "16" mean?', choices: ['Tire width in cm', 'Wheel diameter in inches', 'Maximum pressure', 'Load rating'], answer: 1, fact: '205 is the width in millimeters, and 55 is the sidewall height as a percentage of the width.' },
  { cat: 'mechanics', q: 'In disc brakes, what do the brake pads squeeze?', choices: ['The drum', 'The rotor', 'The hub', 'The caliper'], answer: 1, fact: 'The caliper holds the pads and clamps them onto the spinning rotor.' },
  { cat: 'mechanics', q: 'What does RPM stand for?', choices: ['Rotations Per Mile', 'Revolutions Per Minute', 'Rated Power Maximum', 'Rev Pressure Meter'], answer: 1, fact: 'The tachometer shows how many times the crankshaft spins each minute.' },
  { cat: 'mechanics', q: 'What does OBD stand for, as in the OBD-II port?', choices: ['On-Board Diagnostics', 'Optimal Brake Distribution', 'Onboard Battery Drain', 'Output Boost Device'], answer: 0, fact: 'OBD-II has been required on every car sold in the US since 1996.' },

  // ---- History ----
  { cat: 'history', q: 'What was the first Japanese brand to sell cars in the United States?', choices: ['Honda', 'Nissan', 'Toyota', 'Mazda'], answer: 2, fact: 'Toyota brought the Toyopet Crown to the US in 1958.' },
  { cat: 'history', q: 'When was the Acura NSX first released?', choices: ['1985', '1995', '1990', '2000'], answer: 2, fact: 'Ayrton Senna helped fine-tune the original NSX.' },
  { cat: 'history', q: 'Which company built the Model T?', choices: ['General Motors', 'Ford', 'Dodge', 'Oldsmobile'], answer: 1, fact: 'More than 15 million Model Ts were built between 1908 and 1927.' },
  { cat: 'history', q: 'In what year did the Ford Mustang debut?', choices: ['1959', '1964', '1969', '1972'], answer: 1, fact: 'Ford took 22,000 orders for the Mustang on its first day.' },
  { cat: 'history', q: 'What was the first mass-produced hybrid car?', choices: ['Honda Insight', 'Toyota Prius', 'Chevrolet Volt', 'Ford Fusion'], answer: 1, fact: 'The Prius went on sale in Japan in 1997.' },
  { cat: 'history', q: "What was Tesla's first production car?", choices: ['Model S', 'Model 3', 'Roadster', 'Model X'], answer: 2, fact: 'The 2008 Roadster was built on a Lotus Elise chassis.' },
  { cat: 'history', q: 'Which car became a time machine in "Back to the Future"?', choices: ['DeLorean DMC-12', 'Pontiac Firebird', 'Ford Thunderbird', 'Chevrolet Camaro'], answer: 0, fact: 'It needed 1.21 gigawatts to travel through time.' },
  { cat: 'history', q: 'Who coined the term "horsepower"?', choices: ['Karl Benz', 'Henry Ford', 'James Watt', 'Nikola Tesla'], answer: 2, fact: 'Watt used it to compare his steam engines with draft horses.' },
  { cat: 'history', q: 'Which car earned the nickname "Godzilla"?', choices: ['Toyota Supra', 'Nissan Skyline GT-R', 'Mazda RX-7', 'Honda NSX'], answer: 1, fact: 'The R32 GT-R dominated Australian touring car racing.' },
  { cat: 'history', q: 'What does SUV stand for?', choices: ['Super Utility Van', 'Sport Utility Vehicle', 'Standard Urban Vehicle', 'Special Use Vehicle'], answer: 1, fact: 'Jeep is often credited with popularizing the term.' },

  // ---- Motorsport ----
  { cat: 'racing', q: 'In which country is the 24 Hours of Le Mans held?', choices: ['Belgium', 'France', 'Italy', 'Monaco'], answer: 1, fact: 'The race has been run near the town of Le Mans since 1923.' },
  { cat: 'racing', q: 'How long is the Indianapolis 500 race?', choices: ['500 km', '500 laps', '500 miles', '500 minutes'], answer: 2, fact: 'That is 200 laps of the 2.5-mile oval.' },
  { cat: 'racing', q: 'Who was the first driver to win seven Formula 1 World Championships?', choices: ['Ayrton Senna', 'Michael Schumacher', 'Juan Manuel Fangio', 'Alain Prost'], answer: 1, fact: 'Schumacher won his seventh title in 2004. Lewis Hamilton matched him in 2020.' },
  { cat: 'racing', q: 'What does a waved checkered flag mean?', choices: ['Pit lane open', 'Hazard on track', 'Race finished', 'Final lap'], answer: 2, fact: 'A white flag usually signals the final lap.' },
  { cat: 'racing', q: 'In Formula 1, what does DRS help drivers do?', choices: ['Brake later', 'Overtake on straights', 'Cool their tires', 'Save fuel'], answer: 1, fact: 'DRS opens a flap in the rear wing to cut drag.' },
  { cat: 'racing', q: 'Which American racing series is famous for stock cars on oval tracks?', choices: ['IndyCar', 'NASCAR', 'IMSA', 'Formula E'], answer: 1, fact: 'NASCAR was founded in Daytona Beach in 1948.' },
  { cat: 'racing', q: "What is Formula E's main difference from Formula 1?", choices: ['No pit stops', 'All-electric cars', 'Two drivers per car', 'Only street circuits at night'], answer: 1, fact: 'The first Formula E race was held in Beijing in 2014.' },
];

const CATEGORIES = {
  all: { label: 'Mixed', icon: '🏁' },
  brands: { label: 'Brands', icon: '🏷️' },
  mechanics: { label: 'Under the Hood', icon: '🔧' },
  history: { label: 'History', icon: '📜' },
  racing: { label: 'Motorsport', icon: '🏎️' },
};
