const Alexa = require("ask-sdk-core");
const Fuzz = require('fuzzball');
const indefinite = require("indefinite");

var skill;

exports.handler = async(event, context) => {
    if (!skill) {
        skill = Alexa.SkillBuilders.custom()
            .addRequestHandlers(
                AnimalCrossingCollectiblePricingHandler,
                AnimalCrossingVillagerInfoHandler,
                AboutHandler,
                LaunchHandler,
                HelpHandler,
                RepeatHandler,
                ExitHandler,
                SessionEndedRequestHandler,
            )
            .addErrorHandlers(ErrorHandler)
            .create();
    }
    return await skill.invoke(event, context);
};

const ErrorHandler = {
    canHandle(input) {
        return true;
    },
    handle(input) {
        console.info("Error Event\n" + JSON.stringify(input, null, 2));

        return input.responseBuilder
            .speak("Sorry, I couldn't understand what you asked. Please try again.")
            .reprompt("Sorry, I couldn't understand what you asked. Please try again.")
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        console.log('Inside SessionEndedRequestHandler');
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        return handlerInput.responseBuilder.getResponse();
    },
};

const LaunchHandler = {
    canHandle(input) {
        return input.requestEnvelope.request.type === "LaunchRequest";
    },
    handle(input) {
        console.info("About Event\n" + JSON.stringify(input, null, 2));

        var exampleItem = collectibleKeys[Math.floor(Math.random() * collectibleKeys.length)];

        console.info(`${exampleItem} : ${indefinite(exampleItem)}`);

        return input.responseBuilder
            .speak(`Welcome to Animal Crossing Pricing. You can ask a question like, what\'s the price of ${indefinite(exampleItem)}? ... Now, what can I help you with?`)
            .reprompt("For instructions on what you can say, please say help me.")
            .getResponse();
    }
};

const ExitHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent' ||
                handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent' ||
                handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NavigateHomeIntent');
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak("Goodbye!")
            .getResponse();
    },
};

const HelpHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        var properItem;
        var villager;
        try {
            var exampleItem = collectibleKeys[Math.floor(Math.random() * collectibleKeys.length)];

            properItem = indefinite(exampleItem);

            villager = villagerKeys[Math.floor(Math.random() * villagerKeys.length)];
            
            console.info(`${exampleItem} : ${properItem}`);
        } catch (error) {
            console.error(error);

            properItem = "an anchovy";
            villager = "Cherry";
        }

        return handlerInput.responseBuilder
            .speak(`You can ask questions about collectibles and villagers such as, what\'s the price of ${properItem} or who is ${villager}. You can also say exit... Now, what can I help you with?`)
            .reprompt(`You can ask questions about collectibles and villagers such as, what\'s the price of ${properItem} or who is ${villager}. You can also say exit... Now, what can I help you with?`)
            .getResponse();
    },
};

const RepeatHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === 'AMAZON.RepeatIntent';
    },
    handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        return handlerInput.responseBuilder
            .speak(sessionAttributes.speakOutput)
            .reprompt(sessionAttributes.repromptSpeech)
            .getResponse();
    },
};

const AboutHandler = {
    canHandle(input) {
        return input.requestEnvelope.request.type === "IntentRequest" &&
            input.requestEnvelope.request.intent.name === "AboutIntent";
    },
    handle(input) {
        console.info("About Event\n" + JSON.stringify(input, null, 2));
        
        return input.responseBuilder
            .speak("ACNH Almanac was conceived in Dusty's apartment")
            .withSimpleCard("About Animal Crossing Pricing", "Animal Crossing Pricing was created by Joshua Kaminsky")
            .withShouldEndSession(false)
            .getResponse();
    }
};

const fuzzyOptions = {
    // any function that takes two values and returns a score, default: ratio
    scorer: Fuzz.token_sort_ratio,
    // attempt simple scoring first
    trySimple: true,
    // max number of top results to return, default: no limit / 0.
    limit: 5,
    // lowest score to return, default: 0
    //cutoff: 60,
    // results won't be sorted if true, default: false. If true limit will be ignored.
    unsorted: false
};

const AnimalCrossingCollectiblePricingHandler = {
    canHandle(input) {
        return input.requestEnvelope.request.type === "IntentRequest" && input.requestEnvelope.request.intent.name === "CollectableSellPriceIntent";
    },
    handle(input) {
        console.info("Pricing Event\n" + JSON.stringify(input, null, 2));

        var shouldEndSession = input.requestEnvelope.session.new;
        
        try {
            var collectible = input.requestEnvelope.request.intent.slots.collectible.value;

            if (collectible) {
                console.info(`Looking Up: ${collectible}`);
                
                var extract = Fuzz.extract(collectible, collectibleKeys, fuzzyOptions);

                if(collectible.indexOf(' ') >= 0) {
                    extract = extract.concat(Fuzz.extract(collectible.replace(/ /g,''), collectibleKeys, fuzzyOptions));
                
                    extract = extract.sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]));
                }
                
                console.log(extract);

                if (extract.length >= 1) {
                    var collectibleKey = extract[0][0];

                    var collectibleValue = collectibleData[collectibleKey];

                    console.log(collectibleKey);
                    console.log(collectibleValue);

                    if (collectibleKey) {
                        return input.responseBuilder
                            .speak(`The collectible ${collectibleKey} is worth ${collectibleValue} bells.`)
                            .withSimpleCard(`The collectible ${collectibleKey} is worth ${collectibleValue} bells.`)
                            .withShouldEndSession(true)
                            .getResponse();
                    }
                }

                return input.responseBuilder
                    .speak(`Unable to find pricing for ${collectible}. Please request a valid collectible.`)
                    .withSimpleCard(`Unable to find pricing for ${collectible}.`)
                    .withShouldEndSession(shouldEndSession)
                    .getResponse();

            }
        } catch (error) {
            console.log(error);
        }

        return input.responseBuilder
            .speak("Please request a valid collectible.")
            .withSimpleCard("Please request a valid collectible.")
            .withShouldEndSession(shouldEndSession)
            .getResponse();
    }
};

const AnimalCrossingVillagerInfoHandler = {
    canHandle(input) {
        return input.requestEnvelope.request.type === "IntentRequest" && input.requestEnvelope.request.intent.name === "VillagerInfoIntent";
    },
    handle(input) {
        console.info("Villager Info Event\n" + JSON.stringify(input, null, 2));

        var shouldEndSession = input.requestEnvelope.session.new;
        
        try {
            var villagerName = input.requestEnvelope.request.intent.slots.villagerName.value;

            if (villagerName) {
                var extract = Fuzz.extract(villagerName, villagerKeys, fuzzyOptions);

                console.log(extract);

                if (extract.length >= 1) {
                    var villagerKey = extract[0][0];

                    var villagerValue = villagersData[villagerKey];

                    console.log(villagerKey);
                    console.log(villagerValue);

                    if (villagerKey) {
                        return input.responseBuilder
                            .speak(`The villager ${villagerName} is ranked ${villagerValue.rank} and is tier ${villagerValue.tier}.`)
                            .withSimpleCard(`The villager ${villagerName} is ranked ${villagerValue.rank} and is tier ${villagerValue.tier}.`)
                            .withShouldEndSession(true)
                            .getResponse();
                    }
                }

                return input.responseBuilder
                    .speak(`Unable to find a villager named ${villagerName}. Please request a valid villager.`)
                    .withSimpleCard(`Unable to find a villager named ${villagerName}.`)
                    .withShouldEndSession(shouldEndSession)
                    .getResponse();

            }
        } catch (error) {
            console.log(error);
        }

        return input.responseBuilder
            .speak("Please request a valid villager.")
            .withSimpleCard("Please request a valid villager.")
            .withShouldEndSession(shouldEndSession)
            .getResponse();
    }
};

var collectibleData = { "Academic Painting": 1245, "Acanthostega": 2000, "Agrias Butterfly": 3000, "Amazing Painting": 1245, "Amber": 1200, "Ammonite": 1100, "Anchovy": 200, "Ancient Statue": 1245, "Angelfish": 3000, "Ankylo Skull": 3500, "Ankylo Tail": 2500, "Ankylo Torso": 3000, "Anomalocaris": 2000, "Ant": 80, "Arapaima": 10000, "Archaeopteryx": 1300, "Archelon Skull": 4000, "Archelon Tail": 3500, "Arowana": 10000, "Atlas Moth": 3000, "Australopith": 1100, "Bagworm": 600, "Banded Dragonfly": 4500, "Barred Knifejaw": 5000, "Barreleye": 15000, "Basic Painting": 1245, "Beautiful Statue": 1245, "Bell Cricket": 430, "Betta": 2500, "Bitterling": 900, "Black Bass": 400, "Blowfish": 5000, "Blue Marlin": 10000, "Blue Weevil Beetle": 800, "Bluegill": 180, "Brachio Chest": 5500, "Brachio Pelvis": 5000, "Brachio Skull": 6000, "Brachio Tail": 5500, "Brown Cicada": 250, "Butterfly Fish": 1000, "Calm Painting": 1245, "Carp": 300, "Catfish": 800, "Centipede": 300, "Char": 3800, "Cherry Salmon": 1000, "Cicada Shell": 10, "Citrus Long-horned Beetle": 350, "Clown Fish": 650, "Coelacanth": 15000, "Common Bluebottle": 300, "Common Butterfly": 160, "Common Painting": 1245, "Coprolite": 1100, "Crawfish": 200, "Cricket": 130, "Crucian Carp": 160, "Cyclommatus Stag": 8000, "Dab": 300, "Dace": 240, "Damselfly": 500, "Darner Dragonfly": 230, "Deinony Tail": 2500, "Deinony Torso": 3000, "Detailed Painting": 1245, "Dimetrodon Skull": 5500, "Dimetrodon Torso": 5000, "Dinosaur Track": 1000, "Diplo Chest": 4000, "Diplo Neck": 4500, "Diplo Pelvis": 4500, "Diplo Skull": 5000, "Diplo Tail": 5000, "Diplo Tail Tip": 4000, "Diving Beetle": 800, "Dorado": 15000, "Drone Beetle": 200, "Dung Beetle": 3000, "Dunkleosteus": 3500, "Dynamic Painting": 1245, "Earth-boring Dung Beetle": 300, "Emperor Butterfly": 4000, "Eusthenopteron": 2000, "Evening Cicada": 550, "Familiar Statue": 1245, "Famous Painting": 1245, "Firefly": 300, "Flea": 70, "Flowery Painting": 1245, "Fly": 60, "Football Fish": 2500, "Freshwater Goby": 400, "Frog": 120, "Gallant Statue": 1245, "Gar": 6000, "Giant Cicada": 500, "Giant Snakehead": 5500, "Giant Stag": 10000, "Giant Trevally": 4500, "Giant Water Bug": 2000, "Giraffe Stag": 12000, "Glowing Painting": 1245, "Golden Stag": 12000, "Golden Trout": 15000, "Goldfish": 1300, "Goliath Beetle": 8000, "Graceful Painting": 1245, "Grasshopper": 160, "Great Purple Emperor": 3000, "Great Statue": 1245, "Great White Shark": 15000, "Guppy": 1300, "Hammerhead Shark": 8000, "Hermit Crab": 1000, "Honeybee": 200, "Horned Atlas": 8000, "Horned Dynastid": 1350, "Horned Elephant": 8000, "Horned Hercules": 12000, "Horse Mackerel": 150, "Iguanodon Skull": 4000, "Iguanodon Tail": 3000, "Iguanodon Torso": 3500, "Informative Statue": 1245, "Jewel Beetle": 2400, "Jolly Painting": 1245, "Juramaia": 1500, "Killifish": 300, "King Salmon": 1800, "Koi": 4000, "Ladybug": 200, "Left Megalo Side": 4000, "Left Ptera Wing": 4500, "Left Quetzal Wing": 5000, "Loach": 400, "Long Locust": 200, "Madagascan Sunset Moth": 2500, "Mahi-mahi": 6000, "Mammoth Skull": 3000, "Mammoth Torso": 2500, "Man-faced Stink Bug": 1000, "Mantis": 430, "Megacero Skull": 4500, "Megacero Tail": 3000, "Megacero Torso": 3500, "Migratory Locust": 600, "Mitten Crab": 2000, "Miyama Stag": 1000, "Mole Cricket": 500, "Monarch Butterfly": 140, "Moody Painting": 1245, "Moray Eel": 2000, "Mosquito": 130, "Moth": 130, "Motherly Statue": 1245, "Moving Painting": 1245, "Myllokunmingia": 1500, "Mysterious Painting": 1245, "Mystic Statue": 1245, "Napoleonfish": 10000, "Neon Tetra": 500, "Nibble Fish": 1500, "Nice Painting": 1245, "Oarfish": 9000, "Ocean Sunfish": 4000, "Olive Flounder": 800, "Ophthalmo Skull": 2500, "Ophthalmo Torso": 2000, "Orchid Mantis": 2400, "Pachy Skull": 4000, "Pachy Tail": 3500, "Pale Chub": 200, "Paper Kite Butterfly": 1000, "Parasaur Skull": 3500, "Parasaur Tail": 2500, "Parasaur Torso": 3000, "Peacock Butterfly": 2500, "Perfect Painting": 1245, "Pike": 1800, "Pill Bug": 250, "Piranha": 2500, "Plesio Body": 4500, "Plesio Skull": 4000, "Plesio Tail": 4500, "Pond Smelt": 400, "Pondskater": 130, "Pop-eyed Goldfish": 1300, "Proper Painting": 1245, "Ptera Body": 4000, "Puffer Fish": 250, "Quaint Painting": 1245, "Queen Alexandra's Birdwing": 4000, "Quetzal Torso": 4500, "Rainbow Stag": 6000, "Rainbowfish": 800, "Rajah Brooke's Birdwing": 2500, "Ranchu Goldfish": 4500, "Ray": 3000, "Red Dragonfly": 180, "Red Snapper": 3000, "Ribbon Eel": 600, "Rice Grasshopper": 400, "Right Megalo Side": 5500, "Right Ptera Wing": 4500, "Right Quetzal Wing": 5000, "Robust Cicada": 300, "Robust Statue": 1245, "Rock-head Statue": 1245, "Rosalia Batesi Beetle": 3000, "Sabertooth Skull": 2500, "Sabertooth Tail": 2000, "Saddled Bichir": 4000, "Salmon": 700, "Saw Shark": 12000, "Saw Stag": 2000, "Scarab Beetle": 10000, "Scary Painting": 1245, "Scenic Painting": 1245, "Scorpion": 8000, "Sea Bass": 400, "Sea Butterfly": 1000, "Sea Horse": 1100, "Serene Painting": 1245, "Shark-tooth Pattern": 1000, "Sinking Painting": 1245, "Snail": 250, "Snapping Turtle": 5000, "Soft-shelled Turtle": 3750, "Solemn Painting": 1245, "Spider": 600, "Spino Skull": 4000, "Spino Tail": 2500, "Spino Torso": 3000, "Squid": 500, "Stego Skull": 5000, "Stego Tail": 4000, "Stego Torso": 4500, "Stinkbug": 120, "Stringfish": 15000, "Sturgeon": 10000, "Suckerfish": 1500, "Surgeonfish": 1000, "Sweetfish": 900, "T. Rex Skull": 6000, "T. Rex Tail": 5000, "T. Rex Torso": 5500, "Tadpole": 100, "Tarantula": 8000, "Tiger Beetle": 1500, "Tiger Butterfly": 240, "Tilapia": 800, "Tremendous Statue": 1245, "Tricera Skull": 5500, "Tricera Tail": 4500, "Tricera Torso": 5000, "Trilobite": 1300, "Tuna": 7000, "Twinkling Painting": 1245, "Valiant Statue": 1245, "Violin Beetle": 450, "Walker Cicada": 400, "Walking Leaf": 600, "Walking Stick": 600, "Warm Painting": 1245, "Warrior Statue": 1245, "Wasp": 2500, "Whale Shark": 13000, "Wharf Roach": 200, "Wild Painting Left Half": 1245, "Wild Painting Right Half": 1245, "Wistful Painting": 1245, "Worthy Painting": 1245, "Yellow Butterfly": 160, "Yellow Perch": 300, "Zebra Turkeyfish": 500 };

var villagersData = {"Raymond":{"rank":1,"tier":1,"personality":"Smug"},"Marshal":{"rank":2,"tier":1,"personality":"Smug"},"Marina":{"rank":3,"tier":1,"personality":"Normal"},"Scoot":{"rank":4,"tier":1,"personality":"Jock"},"Zucker":{"rank":5,"tier":1,"personality":"Lazy"},"Sherb":{"rank":6,"tier":1,"personality":"Lazy"},"Bob":{"rank":7,"tier":1,"personality":"Lazy"},"Beau":{"rank":8,"tier":1,"personality":"Lazy"},"Audie":{"rank":9,"tier":1,"personality":"Peppy"},"Fauna":{"rank":10,"tier":1,"personality":"Normal"},"Coco":{"rank":11,"tier":2,"personality":"Normal"},"Lucky":{"rank":12,"tier":2,"personality":"Lazy"},"Stitches":{"rank":13,"tier":2,"personality":"Lazy"},"Judy":{"rank":14,"tier":2,"personality":"Snooty"},"Merengue":{"rank":15,"tier":2,"personality":"Normal"},"Molly":{"rank":16,"tier":2,"personality":"Normal"},"Goldie":{"rank":17,"tier":2,"personality":"Normal"},"Punchy":{"rank":18,"tier":2,"personality":"Lazy"},"Lolly":{"rank":19,"tier":2,"personality":"Normal"},"Cherry":{"rank":20,"tier":2,"personality":"Sisterly"},"Diana":{"rank":21,"tier":3,"personality":"Snooty"},"Roald":{"rank":22,"tier":3,"personality":"Jock"},"Ankha":{"rank":23,"tier":3,"personality":"Snooty"},"Apollo":{"rank":24,"tier":3,"personality":"Cranky"},"Dom":{"rank":25,"tier":3,"personality":"Jock"},"Rosie":{"rank":26,"tier":3,"personality":"Peppy"},"Fang":{"rank":27,"tier":3,"personality":"Cranky"},"Whitney":{"rank":28,"tier":3,"personality":"Snooty"},"Pietro":{"rank":29,"tier":3,"personality":"Smug"},"Bangle":{"rank":30,"tier":3,"personality":"Peppy"},"Julian":{"rank":31,"tier":4,"personality":"Smug"},"Apple":{"rank":32,"tier":4,"personality":"Peppy"},"Tangy":{"rank":33,"tier":4,"personality":"Peppy"},"Ketchup":{"rank":34,"tier":4,"personality":"Peppy"},"Erik":{"rank":35,"tier":4,"personality":"Lazy"},"Skye":{"rank":36,"tier":4,"personality":"Normal"},"Flora":{"rank":37,"tier":4,"personality":"Peppy"},"Tia":{"rank":38,"tier":4,"personality":"Normal"},"Maple":{"rank":39,"tier":4,"personality":"Normal"},"Flurry":{"rank":40,"tier":4,"personality":"Normal"},"Cookie":{"rank":41,"tier":5,"personality":"Peppy"},"Lily":{"rank":42,"tier":5,"personality":"Normal"},"Filbert":{"rank":43,"tier":5,"personality":"Lazy"},"Katt":{"rank":44,"tier":5,"personality":"Sisterly"},"Pashmina":{"rank":45,"tier":5,"personality":"Sisterly"},"Kiki":{"rank":46,"tier":5,"personality":"Normal"},"Octavian":{"rank":47,"tier":5,"personality":"Cranky"},"Wolfgang":{"rank":48,"tier":5,"personality":"Cranky"},"Hornsby":{"rank":49,"tier":5,"personality":"Lazy"},"Melba":{"rank":50,"tier":5,"personality":"Normal"},"Bam":{"rank":51,"tier":6,"personality":"Jock"},"Poppy":{"rank":52,"tier":6,"personality":"Normal"},"Kyle":{"rank":53,"tier":6,"personality":"Smug"},"Muffy":{"rank":54,"tier":6,"personality":"Sisterly"},"Chevre":{"rank":55,"tier":6,"personality":"Normal"},"Clay":{"rank":56,"tier":6,"personality":"Lazy"},"Kabuki":{"rank":57,"tier":6,"personality":"Cranky"},"Bianca":{"rank":58,"tier":6,"personality":"Peppy"},"Bluebear":{"rank":59,"tier":6,"personality":"Peppy"},"Aurora":{"rank":60,"tier":6,"personality":"Normal"},"Drago":{"rank":61,"tier":6,"personality":"Lazy"},"Genji":{"rank":62,"tier":6,"personality":"Jock"},"Freya":{"rank":63,"tier":6,"personality":"Snooty"},"Agnes":{"rank":64,"tier":6,"personality":"Sisterly"},"Phoebe":{"rank":65,"tier":6,"personality":"Sisterly"},"Peanut":{"rank":66,"tier":6,"personality":"Peppy"},"Antonio":{"rank":67,"tier":6,"personality":"Jock"},"Gayle":{"rank":68,"tier":6,"personality":"Normal"},"Ruby":{"rank":69,"tier":6,"personality":"Peppy"},"Vesta":{"rank":70,"tier":6,"personality":"Normal"},"Cube":{"rank":71,"tier":6,"personality":"Lazy"},"Merry":{"rank":72,"tier":6,"personality":"Peppy"},"Mitzi":{"rank":73,"tier":6,"personality":"Normal"},"Shari":{"rank":74,"tier":6,"personality":"Sisterly"},"Ozzie":{"rank":75,"tier":6,"personality":"Lazy"},"Bunnie":{"rank":76,"tier":6,"personality":"Peppy"},"Kid Cat":{"rank":77,"tier":6,"personality":"Jock"},"Wendy":{"rank":78,"tier":6,"personality":"Peppy"},"Teddy":{"rank":79,"tier":6,"personality":"Jock"},"Hamlet":{"rank":80,"tier":6,"personality":"Jock"},"Daisy":{"rank":81,"tier":6,"personality":"Normal"},"Pekoe":{"rank":82,"tier":6,"personality":"Normal"},"Biskit":{"rank":83,"tier":6,"personality":"Lazy"},"Zell":{"rank":84,"tier":6,"personality":"Smug"},"Sprocket":{"rank":85,"tier":6,"personality":"Jock"},"Dotty":{"rank":86,"tier":6,"personality":"Peppy"},"Snake":{"rank":87,"tier":6,"personality":"Jock"},"Lobo":{"rank":88,"tier":6,"personality":"Cranky"},"Chief":{"rank":89,"tier":6,"personality":"Cranky"},"Nan":{"rank":90,"tier":6,"personality":"Normal"},"Puddles":{"rank":91,"tier":6,"personality":"Peppy"},"Eugene":{"rank":92,"tier":6,"personality":"Smug"},"Biff":{"rank":93,"tier":6,"personality":"Jock"},"Shep":{"rank":94,"tier":6,"personality":"Smug"},"Roscoe":{"rank":95,"tier":6,"personality":"Cranky"},"Isabelle":{"rank":96,"tier":6,"personality":""},"Ribbot":{"rank":97,"tier":6,"personality":"Jock"},"Tank":{"rank":98,"tier":6,"personality":"Jock"},"Cranston":{"rank":99,"tier":6,"personality":"Lazy"},"Dobie":{"rank":100,"tier":6,"personality":"Cranky"},"Bones":{"rank":101,"tier":6,"personality":"Lazy"},"Rolf":{"rank":102,"tier":6,"personality":"Cranky"},"Hazel":{"rank":103,"tier":6,"personality":"Sisterly"},"Mira":{"rank":104,"tier":6,"personality":"Sisterly"},"Bill":{"rank":105,"tier":6,"personality":"Jock"},"Lyman":{"rank":106,"tier":6,"personality":"Jock"},"Canberra":{"rank":107,"tier":6,"personality":"Sisterly"},"Reneigh":{"rank":108,"tier":6,"personality":"Sisterly"},"Henry":{"rank":109,"tier":6,"personality":"Smug"},"Cheri":{"rank":110,"tier":6,"personality":"Peppy"},"Flo":{"rank":111,"tier":6,"personality":"Sisterly"},"Tutu":{"rank":112,"tier":6,"personality":"Peppy"},"Julia":{"rank":113,"tier":6,"personality":"Snooty"},"Celia":{"rank":114,"tier":6,"personality":"Normal"},"Olivia":{"rank":115,"tier":6,"personality":"Snooty"},"Sydney":{"rank":116,"tier":6,"personality":"Normal"},"Kidd":{"rank":117,"tier":6,"personality":"Smug"},"Dizzy":{"rank":118,"tier":6,"personality":"Lazy"},"Gladys":{"rank":119,"tier":6,"personality":"Normal"},"Ellie":{"rank":120,"tier":6,"personality":"Normal"},"Papi":{"rank":121,"tier":6,"personality":"Lazy"},"June":{"rank":122,"tier":6,"personality":"Normal"},"Chrissy":{"rank":123,"tier":6,"personality":"Peppy"},"Fuchsia":{"rank":124,"tier":6,"personality":"Sisterly"},"Static":{"rank":125,"tier":6,"personality":"Cranky"},"Moe":{"rank":126,"tier":6,"personality":"Lazy"},"Lopez":{"rank":127,"tier":6,"personality":"Smug"},"Freckles":{"rank":128,"tier":6,"personality":"Peppy"},"Rex":{"rank":129,"tier":6,"personality":"Lazy"},"Savannah":{"rank":130,"tier":6,"personality":"Normal"},"Boomer":{"rank":131,"tier":6,"personality":"Lazy"},"Tammy":{"rank":132,"tier":6,"personality":"Sisterly"},"Olive":{"rank":133,"tier":6,"personality":"Normal"},"Mac":{"rank":134,"tier":6,"personality":"Jock"},"Alfonso":{"rank":135,"tier":6,"personality":"Lazy"},"Phil":{"rank":136,"tier":6,"personality":"Smug"},"Goose":{"rank":137,"tier":6,"personality":"Jock"},"Tom":{"rank":138,"tier":6,"personality":"Cranky"},"Margie":{"rank":139,"tier":6,"personality":"Normal"},"Walker":{"rank":140,"tier":6,"personality":"Lazy"},"Norma":{"rank":141,"tier":6,"personality":"Normal"},"Carmen":{"rank":142,"tier":6,"personality":"Peppy"},"Deirdre":{"rank":143,"tier":6,"personality":"Sisterly"},"Joey":{"rank":144,"tier":6,"personality":"Lazy"},"Stella":{"rank":145,"tier":6,"personality":"Normal"},"Jeremiah":{"rank":146,"tier":6,"personality":"Lazy"},"Poncho":{"rank":147,"tier":6,"personality":"Jock"},"Stu":{"rank":148,"tier":6,"personality":"Lazy"},"Rudy":{"rank":149,"tier":6,"personality":"Jock"},"Wade":{"rank":150,"tier":6,"personality":"Lazy"},"Gala":{"rank":151,"tier":6,"personality":"Normal"},"Raddle":{"rank":152,"tier":6,"personality":"Lazy"},"Diva":{"rank":153,"tier":6,"personality":"Sisterly"},"Billy":{"rank":154,"tier":6,"personality":"Jock"},"Felicity":{"rank":155,"tier":6,"personality":"Peppy"},"Bruce":{"rank":156,"tier":6,"personality":"Cranky"},"Keaton":{"rank":157,"tier":6,"personality":"Smug"},"Bubbles":{"rank":158,"tier":6,"personality":"Peppy"},"Pango":{"rank":159,"tier":6,"personality":"Peppy"},"Maddie":{"rank":160,"tier":6,"personality":"Peppy"},"Boots":{"rank":161,"tier":6,"personality":"Jock"},"Bea":{"rank":162,"tier":6,"personality":"Normal"},"Tiffany":{"rank":163,"tier":6,"personality":"Snooty"},"Axel":{"rank":164,"tier":6,"personality":"Jock"},"Tex":{"rank":165,"tier":6,"personality":"Smug"},"Sly":{"rank":166,"tier":6,"personality":"Jock"},"Pinky":{"rank":167,"tier":6,"personality":"Peppy"},"Butch":{"rank":168,"tier":6,"personality":"Cranky"},"Alice":{"rank":169,"tier":6,"personality":"Normal"},"Megan":{"rank":170,"tier":6,"personality":"Normal"},"Deli":{"rank":171,"tier":6,"personality":"Lazy"},"Nana":{"rank":172,"tier":6,"personality":"Normal"},"Flip":{"rank":173,"tier":6,"personality":"Jock"},"Pierce":{"rank":174,"tier":6,"personality":"Jock"},"Pate":{"rank":175,"tier":6,"personality":"Peppy"},"Del":{"rank":176,"tier":6,"personality":"Cranky"},"Frita":{"rank":177,"tier":6,"personality":"Sisterly"},"Buck":{"rank":178,"tier":6,"personality":"Jock"},"Blanche":{"rank":179,"tier":6,"personality":"Snooty"},"Francine":{"rank":180,"tier":6,"personality":"Snooty"},"Vivian":{"rank":181,"tier":6,"personality":"Snooty"},"Piper":{"rank":182,"tier":6,"personality":"Peppy"},"Boone":{"rank":183,"tier":6,"personality":"Jock"},"Bella":{"rank":184,"tier":6,"personality":"Peppy"},"Walt":{"rank":185,"tier":6,"personality":"Cranky"},"Colton":{"rank":186,"tier":6,"personality":"Smug"},"Pudge":{"rank":187,"tier":6,"personality":"Lazy"},"Sterling":{"rank":188,"tier":6,"personality":"Jock"},"Midge":{"rank":189,"tier":6,"personality":"Normal"},"Coach":{"rank":190,"tier":6,"personality":"Jock"},"Drake":{"rank":191,"tier":6,"personality":"Lazy"},"Rodeo":{"rank":192,"tier":6,"personality":"Lazy"},"Pompom":{"rank":193,"tier":6,"personality":"Peppy"},"Avery":{"rank":194,"tier":6,"personality":"Cranky"},"Bertha":{"rank":195,"tier":6,"personality":"Normal"},"Prince":{"rank":196,"tier":6,"personality":"Lazy"},"Eunice":{"rank":197,"tier":6,"personality":"Normal"},"Patty":{"rank":198,"tier":6,"personality":"Peppy"},"Al":{"rank":199,"tier":6,"personality":"Lazy"},"Chadder":{"rank":200,"tier":6,"personality":"Smug"},"Camofrog":{"rank":201,"tier":6,"personality":"Cranky"},"Tabby":{"rank":202,"tier":6,"personality":"Peppy"},"Anchovy":{"rank":203,"tier":6,"personality":"Lazy"},"Mint":{"rank":204,"tier":6,"personality":"Snooty"},"Lionel":{"rank":205,"tier":6,"personality":"Smug"},"Chops":{"rank":206,"tier":6,"personality":"Smug"},"Elvis":{"rank":207,"tier":6,"personality":"Cranky"},"Nate":{"rank":208,"tier":6,"personality":"Lazy"},"Agent S":{"rank":209,"tier":6,"personality":"Peppy"},"Twiggy":{"rank":210,"tier":6,"personality":"Peppy"},"Egbert":{"rank":211,"tier":6,"personality":"Lazy"},"Annalisa":{"rank":212,"tier":6,"personality":"Normal"},"Spike":{"rank":213,"tier":6,"personality":"Cranky"},"Stinky":{"rank":214,"tier":6,"personality":"Jock"},"Portia":{"rank":215,"tier":6,"personality":"Snooty"},"Winnie":{"rank":216,"tier":6,"personality":"Peppy"},"Sprinkles":{"rank":217,"tier":6,"personality":"Peppy"},"Paolo":{"rank":218,"tier":6,"personality":"Lazy"},"Olaf":{"rank":219,"tier":6,"personality":"Smug"},"Graham":{"rank":220,"tier":6,"personality":"Smug"},"Marcel":{"rank":221,"tier":6,"personality":"Lazy"},"Sheldon":{"rank":222,"tier":6,"personality":"Jock"},"Hopper":{"rank":223,"tier":6,"personality":"Cranky"},"Marcie":{"rank":224,"tier":6,"personality":"Normal"},"Beardo":{"rank":225,"tier":6,"personality":"Smug"},"Kitt":{"rank":226,"tier":6,"personality":"Normal"},"Anabelle":{"rank":227,"tier":6,"personality":"Peppy"},"Doc":{"rank":228,"tier":6,"personality":"Lazy"},"Jay":{"rank":229,"tier":6,"personality":"Jock"},"Plucky":{"rank":230,"tier":6,"personality":"Sisterly"},"Tasha":{"rank":231,"tier":6,"personality":"Snooty"},"Cole":{"rank":232,"tier":6,"personality":"Lazy"},"Tybalt":{"rank":233,"tier":6,"personality":"Jock"},"Tipper":{"rank":234,"tier":6,"personality":"Snooty"},"Sylvana":{"rank":235,"tier":6,"personality":"Normal"},"Deena":{"rank":236,"tier":6,"personality":"Normal"},"Chester":{"rank":237,"tier":6,"personality":"Lazy"},"Claude":{"rank":238,"tier":6,"personality":"Lazy"},"Tammi":{"rank":239,"tier":6,"personality":"Peppy"},"Rowan":{"rank":240,"tier":6,"personality":"Jock"},"Benjamin":{"rank":241,"tier":6,"personality":"Lazy"},"Jacob":{"rank":242,"tier":6,"personality":"Lazy"},"Ken":{"rank":243,"tier":6,"personality":"Smug"},"Puck":{"rank":244,"tier":6,"personality":"Lazy"},"Renee":{"rank":245,"tier":6,"personality":"Sisterly"},"Broccolo":{"rank":246,"tier":6,"personality":"Lazy"},"Curt":{"rank":247,"tier":6,"personality":"Cranky"},"Caroline":{"rank":248,"tier":6,"personality":"Normal"},"Hugh":{"rank":249,"tier":6,"personality":"Lazy"},"Rover":{"rank":250,"tier":6,"personality":""},"Ava":{"rank":251,"tier":6,"personality":"Normal"},"Derwin":{"rank":252,"tier":6,"personality":"Lazy"},"Blaire":{"rank":253,"tier":6,"personality":"Snooty"},"Victoria":{"rank":254,"tier":6,"personality":"Peppy"},"Kody":{"rank":255,"tier":6,"personality":"Jock"},"Iggly":{"rank":256,"tier":6,"personality":"Jock"},"Murphy":{"rank":257,"tier":6,"personality":"Cranky"},"Peggy":{"rank":258,"tier":6,"personality":"Peppy"},"Weber":{"rank":259,"tier":6,"personality":"Lazy"},"Nibbles":{"rank":260,"tier":6,"personality":"Peppy"},"Hans":{"rank":261,"tier":6,"personality":"Smug"},"Hamphrey":{"rank":262,"tier":6,"personality":"Cranky"},"Klaus":{"rank":263,"tier":6,"personality":"Smug"},"Bud":{"rank":264,"tier":6,"personality":"Jock"},"Pecan":{"rank":265,"tier":6,"personality":"Snooty"},"Gaston":{"rank":266,"tier":6,"personality":"Cranky"},"Rodney":{"rank":267,"tier":6,"personality":"Smug"},"Willow":{"rank":268,"tier":6,"personality":"Snooty"},"Simon":{"rank":269,"tier":6,"personality":"Lazy"},"Barold":{"rank":270,"tier":6,"personality":"Lazy"},"Rod":{"rank":271,"tier":6,"personality":"Jock"},"Louie":{"rank":272,"tier":6,"personality":"Jock"},"Lucy":{"rank":273,"tier":6,"personality":"Normal"},"Blathers":{"rank":274,"tier":6,"personality":""},"Sylvia":{"rank":275,"tier":6,"personality":"Sisterly"},"Leonardo":{"rank":276,"tier":6,"personality":"Jock"},"Jacques":{"rank":277,"tier":6,"personality":"Smug"},"Cyd":{"rank":278,"tier":6,"personality":"Cranky"},"Hopkins":{"rank":279,"tier":6,"personality":"Lazy"},"Purrl":{"rank":280,"tier":6,"personality":"Snooty"},"Rasher":{"rank":281,"tier":6,"personality":"Cranky"},"Rocket":{"rank":282,"tier":6,"personality":"Sisterly"},"Grizzly":{"rank":283,"tier":6,"personality":"Cranky"},"Quillson":{"rank":284,"tier":6,"personality":"Smug"},"Bonbon":{"rank":285,"tier":6,"personality":"Peppy"},"Sally":{"rank":286,"tier":6,"personality":"Normal"},"Gruff":{"rank":287,"tier":6,"personality":"Cranky"},"Gonzo":{"rank":288,"tier":6,"personality":"Cranky"},"Groucho":{"rank":289,"tier":6,"personality":"Cranky"},"Kitty":{"rank":290,"tier":6,"personality":"Snooty"},"Dora":{"rank":291,"tier":6,"personality":"Normal"},"Pippy":{"rank":292,"tier":6,"personality":"Peppy"},"Benedict":{"rank":293,"tier":6,"personality":"Lazy"},"Amelia":{"rank":294,"tier":6,"personality":"Snooty"},"Carrie":{"rank":295,"tier":6,"personality":"Normal"},"Kevin":{"rank":296,"tier":6,"personality":"Jock"},"Tom Nook":{"rank":297,"tier":6,"personality":""},"Curlos":{"rank":298,"tier":6,"personality":"Smug"},"Cally":{"rank":299,"tier":6,"personality":"Normal"},"Rhonda":{"rank":300,"tier":6,"personality":"Normal"},"Mott":{"rank":301,"tier":6,"personality":"Jock"},"Leopold":{"rank":302,"tier":6,"personality":"Smug"},"Elmer":{"rank":303,"tier":6,"personality":"Lazy"},"Lucha":{"rank":304,"tier":6,"personality":"Smug"},"Cousteau":{"rank":305,"tier":6,"personality":"Jock"},"Bree":{"rank":306,"tier":6,"personality":"Snooty"},"Yuka":{"rank":307,"tier":6,"personality":"Snooty"},"Tucker":{"rank":308,"tier":6,"personality":"Lazy"},"Knox":{"rank":309,"tier":6,"personality":"Cranky"},"Ursala":{"rank":310,"tier":6,"personality":"Snooty"},"Opal":{"rank":311,"tier":6,"personality":"Snooty"},"Cyrano":{"rank":312,"tier":6,"personality":"Cranky"},"Vladimir":{"rank":313,"tier":6,"personality":"Cranky"},"Celeste":{"rank":314,"tier":6,"personality":""},"Big Top":{"rank":315,"tier":6,"personality":"Lazy"},"Drift":{"rank":316,"tier":6,"personality":"Jock"},"Eloise":{"rank":317,"tier":6,"personality":"Snooty"},"Charlise":{"rank":318,"tier":6,"personality":"Sisterly"},"Ed":{"rank":319,"tier":6,"personality":"Smug"},"Claudia":{"rank":320,"tier":6,"personality":"Snooty"},"Peck":{"rank":321,"tier":6,"personality":"Jock"},"Spork":{"rank":322,"tier":6,"personality":"Lazy"},"Astrid":{"rank":323,"tier":6,"personality":"Snooty"},"Gabi":{"rank":324,"tier":6,"personality":"Peppy"},"Samson":{"rank":325,"tier":6,"personality":"Jock"},"O'Hare":{"rank":326,"tier":6,"personality":"Smug"},"Truffles":{"rank":327,"tier":6,"personality":"Peppy"},"Penelope":{"rank":328,"tier":6,"personality":"Peppy"},"Clyde":{"rank":329,"tier":6,"personality":"Lazy"},"Tad":{"rank":330,"tier":6,"personality":"Jock"},"Gloria":{"rank":331,"tier":6,"personality":"Snooty"},"Maggie":{"rank":332,"tier":6,"personality":"Normal"},"Peewee":{"rank":333,"tier":6,"personality":"Cranky"},"Sandy":{"rank":334,"tier":6,"personality":"Normal"},"Peaches":{"rank":335,"tier":6,"personality":"Normal"},"Vic":{"rank":336,"tier":6,"personality":"Cranky"},"Rory":{"rank":337,"tier":6,"personality":"Jock"},"Monique":{"rank":338,"tier":6,"personality":"Snooty"},"Robin":{"rank":339,"tier":6,"personality":"Snooty"},"Monty":{"rank":340,"tier":6,"personality":"Cranky"},"Admiral":{"rank":341,"tier":6,"personality":"Cranky"},"Candi":{"rank":342,"tier":6,"personality":"Peppy"},"Timmy":{"rank":343,"tier":6,"personality":""},"Bettina":{"rank":344,"tier":6,"personality":"Normal"},"Huck":{"rank":345,"tier":6,"personality":"Smug"},"Curly":{"rank":346,"tier":6,"personality":"Jock"},"Soleil":{"rank":347,"tier":6,"personality":"Snooty"},"Blanca":{"rank":348,"tier":6,"personality":""},"Frank":{"rank":349,"tier":6,"personality":"Cranky"},"Sable":{"rank":350,"tier":6,"personality":""},"Queenie":{"rank":351,"tier":6,"personality":"Snooty"},"Harry":{"rank":352,"tier":6,"personality":"Cranky"},"Jitters":{"rank":353,"tier":6,"personality":"Jock"},"Angus":{"rank":354,"tier":6,"personality":"Cranky"},"Ike":{"rank":355,"tier":6,"personality":"Cranky"},"Croque":{"rank":356,"tier":6,"personality":"Cranky"},"Cobb":{"rank":357,"tier":6,"personality":"Jock"},"Hippeux":{"rank":358,"tier":6,"personality":"Smug"},"Jambette":{"rank":359,"tier":6,"personality":"Normal"},"Mathilda":{"rank":360,"tier":6,"personality":"Snooty"},"Mallary":{"rank":361,"tier":6,"personality":"Snooty"},"Anicotti":{"rank":362,"tier":6,"personality":"Peppy"},"Tommy":{"rank":363,"tier":6,"personality":""},"Gigi":{"rank":364,"tier":6,"personality":"Snooty"},"Rocco":{"rank":365,"tier":6,"personality":"Cranky"},"Friga":{"rank":366,"tier":6,"personality":"Snooty"},"Alli":{"rank":367,"tier":6,"personality":"Snooty"},"Sparro":{"rank":368,"tier":6,"personality":"Jock"},"Rooney":{"rank":369,"tier":6,"personality":"Cranky"},"Cleo":{"rank":370,"tier":6,"personality":"Snooty"},"Limberg":{"rank":371,"tier":6,"personality":"Cranky"},"Miranda":{"rank":372,"tier":6,"personality":"Snooty"},"Cesar":{"rank":373,"tier":6,"personality":"Cranky"},"Redd":{"rank":374,"tier":6,"personality":""},"Frobert":{"rank":375,"tier":6,"personality":"Jock"},"K.K. Slider":{"rank":376,"tier":6,"personality":""},"Ricky":{"rank":377,"tier":6,"personality":"Cranky"},"Timbra":{"rank":378,"tier":6,"personality":"Snooty"},"Snooty":{"rank":379,"tier":6,"personality":"Snooty"},"Gwen":{"rank":380,"tier":6,"personality":"Snooty"},"Baabara":{"rank":381,"tier":6,"personality":"Snooty"},"Paula":{"rank":382,"tier":6,"personality":"Sisterly"},"Maelle":{"rank":383,"tier":6,"personality":"Snooty"},"Gulliver":{"rank":384,"tier":6,"personality":""},"T-Bone":{"rank":385,"tier":6,"personality":"Cranky"},"Violet":{"rank":386,"tier":6,"personality":"Snooty"},"Becky":{"rank":387,"tier":6,"personality":"Snooty"},"Velma":{"rank":388,"tier":6,"personality":"Snooty"},"Naomi":{"rank":389,"tier":6,"personality":"Snooty"},"Leif":{"rank":390,"tier":6,"personality":""},"Kicks":{"rank":391,"tier":6,"personality":""},"Annalise":{"rank":392,"tier":6,"personality":"Snooty"},"Mabel":{"rank":393,"tier":6,"personality":""},"Chow":{"rank":394,"tier":6,"personality":"Cranky"},"Bitty":{"rank":395,"tier":6,"personality":"Snooty"},"Pancetti":{"rank":396,"tier":6,"personality":"Snooty"},"Buzz":{"rank":397,"tier":6,"personality":"Cranky"},"Elise":{"rank":398,"tier":6,"personality":"Snooty"},"Cashmere":{"rank":399,"tier":6,"personality":"Snooty"},"Wart Jr.":{"rank":400,"tier":6,"personality":"Cranky"},"Moose":{"rank":401,"tier":6,"personality":"Jock"},"Jack":{"rank":402,"tier":6,"personality":""},"Broffina":{"rank":403,"tier":6,"personality":"Snooty"},"Boris":{"rank":404,"tier":6,"personality":"Cranky"},"Harvey":{"rank":405,"tier":6,"personality":""},"Greta":{"rank":406,"tier":6,"personality":"Snooty"},"Rizzo":{"rank":407,"tier":6,"personality":"Cranky"},"Don":{"rank":408,"tier":6,"personality":""},"Digby":{"rank":409,"tier":6,"personality":""},"Shrunk":{"rank":410,"tier":6,"personality":""},"Reese":{"rank":411,"tier":6,"personality":""},"Gracie":{"rank":412,"tier":6,"personality":""},"Daisy Mae":{"rank":413,"tier":6,"personality":""},"Joan":{"rank":414,"tier":6,"personality":""},"Luna":{"rank":415,"tier":6,"personality":""},"Zipper":{"rank":416,"tier":6,"personality":""},"Resetti":{"rank":417,"tier":6,"personality":""},"Copper":{"rank":418,"tier":6,"personality":""},"Kapp'n":{"rank":419,"tier":6,"personality":""},"Katrina":{"rank":420,"tier":6,"personality":""},"Labelle":{"rank":421,"tier":6,"personality":""},"Cyrus":{"rank":422,"tier":6,"personality":""},"Pavé":{"rank":423,"tier":6,"personality":""},"Pelly":{"rank":424,"tier":6,"personality":""},"Porter":{"rank":425,"tier":6,"personality":""},"Pascal":{"rank":426,"tier":6,"personality":""},"Lloyd":{"rank":427,"tier":6,"personality":""},"Lottie":{"rank":428,"tier":6,"personality":""},"Brewster":{"rank":429,"tier":6,"personality":""},"Boyd":{"rank":430,"tier":6,"personality":"Cranky"},"Saharah":{"rank":431,"tier":6,"personality":""},"Jingle":{"rank":432,"tier":6,"personality":""},"Tortimer":{"rank":433,"tier":6,"personality":""},"Harriet":{"rank":434,"tier":6,"personality":""},"Wendell":{"rank":435,"tier":6,"personality":""},"wuisp":{"rank":436,"tier":6,"personality":""},"Pete":{"rank":437,"tier":6,"personality":""},"Grams":{"rank":438,"tier":6,"personality":""},"Booker":{"rank":439,"tier":6,"personality":""},"carlo":{"rank":440,"tier":6,"personality":""},"Lyle":{"rank":441,"tier":6,"personality":""},"Phineas":{"rank":442,"tier":6,"personality":""},"Beppe":{"rank":443,"tier":6,"personality":""},"Nat":{"rank":444,"tier":6,"personality":""},"Leila":{"rank":445,"tier":6,"personality":""},"Giovanni":{"rank":446,"tier":6,"personality":""},"Leilani":{"rank":447,"tier":6,"personality":""},"Franklin":{"rank":448,"tier":6,"personality":""},"Katie":{"rank":449,"tier":6,"personality":""},"Phyllis":{"rank":450,"tier":6,"personality":""},"Chip":{"rank":451,"tier":6,"personality":""}}

var collectibleKeys = Object.keys(collectibleData);

var villagerKeys = Object.keys(villagersData);
