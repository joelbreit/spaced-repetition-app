#!/usr/bin/env node

/**
 * Flashcard Conversion Script
 *
 * Converts flashcard data from external format to the spaced repetition app format.
 *
 * Source format:
 * {
 *   "d": [
 *     {
 *       "dn": "Deck Name",
 *       "dc": {
 *         "c1t": "Front text",
 *         "c2t": "Back text"
 *       }
 *     }
 *   ]
 * }
 *
 * Target format:
 * {
 *   "decks": [
 *     {
 *       "deckId": "unique-id",
 *       "deckName": "Deck Name",
 *       "cards": [
 *         {
 *           "cardId": "unique-id",
 *           "front": "Front text",
 *           "back": "Back text",
 *           "reviews": [],
 *           "whenDue": 1234567890
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

const fs = require("fs");
const path = require("path");

/**
 * Generate a unique ID based on timestamp and random number
 * @returns {string} Unique identifier
 */
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convert flashcard data from source format to app format
 * @param {Object} sourceData - The source JSON data
 * @returns {Object} The converted data in app format
 */
function convertFlashcards(sourceData) {
    if (!sourceData || !sourceData.d || !Array.isArray(sourceData.d)) {
        throw new Error(
            'Invalid source format: Expected object with "d" array property'
        );
    }

    const convertedData = {
        decks: [],
    };

    sourceData.d.forEach((sourceDeck, index) => {
        if (!sourceDeck.dn) {
            console.warn(
                `Warning: Deck at index ${index} missing "dn" (deck name), skipping...`
            );
            return;
        }

        const deck = {
            deckId: generateId(),
            deckName: sourceDeck.dn,
            cards: [],
        };

        // Handle the deck card(s)
        if (sourceDeck.dc) {
            // Check if dc is a single card object or array of cards
            if (Array.isArray(sourceDeck.dc)) {
                // Multiple cards format (if the source data has this structure)
                sourceDeck.dc.forEach((cardData, cardIndex) => {
                    if (cardData.c1t && cardData.c2t) {
                        deck.cards.push({
                            cardId: generateId(),
                            front: cardData.c1t,
                            back: cardData.c2t,
                            reviews: [],
                            whenDue: Date.now(),
                        });
                    } else {
                        console.warn(
                            `Warning: Card at index ${cardIndex} in deck "${sourceDeck.dn}" missing required fields, skipping...`
                        );
                    }
                });
            } else if (sourceDeck.dc.c1t && sourceDeck.dc.c2t) {
                // Single card format (as shown in the example)
                deck.cards.push({
                    cardId: generateId(),
                    front: sourceDeck.dc.c1t,
                    back: sourceDeck.dc.c2t,
                    reviews: [],
                    whenDue: Date.now(),
                });
            } else {
                console.warn(
                    `Warning: Deck "${sourceDeck.dn}" has invalid card data, skipping card...`
                );
            }
        } else {
            console.warn(
                `Warning: Deck "${sourceDeck.dn}" has no cards (missing "dc" property)`
            );
        }

        convertedData.decks.push(deck);
    });

    return convertedData;
}

/**
 * Main function to handle command line arguments and file operations
 */
function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
Flashcard Conversion Script

Usage: node convert-flashcards.js <input-file> [output-file]

Arguments:
  input-file   Path to the source JSON file to convert
  output-file  Path for the converted JSON file (optional, defaults to 'converted-flashcards.json')

Example:
  node convert-flashcards.js input.json output.json
  node convert-flashcards.js input.json
`);
        process.exit(1);
    }

    const inputFile = args[0];
    const outputFile = args[1] || "converted-flashcards.json";

    // Check if input file exists
    if (!fs.existsSync(inputFile)) {
        console.error(`Error: Input file "${inputFile}" does not exist`);
        process.exit(1);
    }

    try {
        // Read and parse the input file
        console.log(`Reading input file: ${inputFile}`);
        const inputData = fs.readFileSync(inputFile, "utf8");
        const sourceData = JSON.parse(inputData);

        console.log(
            `Found ${
                sourceData.d ? sourceData.d.length : 0
            } deck(s) in source file`
        );

        // Convert the data
        console.log("Converting flashcard data...");
        const convertedData = convertFlashcards(sourceData);

        console.log(
            `Converted to ${
                convertedData.decks.length
            } deck(s) with ${convertedData.decks.reduce(
                (total, deck) => total + deck.cards.length,
                0
            )} total card(s)`
        );

        // Write the output file
        console.log(`Writing output file: ${outputFile}`);
        fs.writeFileSync(
            outputFile,
            JSON.stringify(convertedData, null, 2),
            "utf8"
        );

        console.log("✅ Conversion completed successfully!");
        console.log(`\nOutput saved to: ${path.resolve(outputFile)}`);
        console.log(
            '\nYou can now upload this file using the "Upload" button in your spaced repetition app.'
        );
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error(`Error: Invalid JSON in input file "${inputFile}"`);
            console.error("Please ensure the file contains valid JSON data");
        } else {
            console.error(`Error: ${error.message}`);
        }
        process.exit(1);
    }
}

// Run the script if called directly
if (require.main === module) {
    main();
}

module.exports = { convertFlashcards, generateId };
