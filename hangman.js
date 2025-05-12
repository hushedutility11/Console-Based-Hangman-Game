#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

const HIGHSCORE_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.hangman_highscores.json');

// Word list for the game
const words = ['cake', 'book', 'tree', 'sun', 'river', 'cloud', 'pizza', 'smile'];

// ASCII art for hangman stages
const hangmanArt = [
  `
   ------
   |    |
        |
        |
        |
        |
  =========`,
  `
   ------
   |    |
   O    |
        |
        |
        |
  =========`,
  `
   ------
   |    |
   O    |
   |    |
        |
        |
  =========`,
  `
   ------
   |    |
   O    |
  /|    |
        |
        |
  =========`,
  `
   ------
   |    |
   O    |
  /|\\   |
        |
        |
  =========`,
  `
   ------
   |    |
   O    |
  /|\\   |
  /     |
        |
  =========`,
  `
   ------
   |    |
   O    |
  /|\\   |
  / \\   |
        |
  =========`,
];

// Load high scores
async function loadHighScores() {
  try {
    const data = await fs.readFile(HIGHSCORE_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Save high score
async function saveHighScore(score, name) {
  const highScores = await loadHighScores();
  highScores.push({ name, score, date: new Date().toISOString() });
  highScores.sort((a, b) => b.score - a.score); // Sort by score descending
  highScores.splice(5); // Keep top 5 scores
  await fs.writeFile(HIGHSCORE_FILE, JSON.stringify(highScores, null, 2));
}

// Display high scores
async function showHighScores() {
  const highScores = await loadHighScores();
  if (!highScores.length) {
    console.log(chalk.yellow('No high scores yet.'));
    return;
  }
  console.log(chalk.blue('High Scores:'));
  highScores.forEach((entry, index) => {
    console.log(`${index + 1}. ${entry.name} - ${entry.score} points (${entry.date})`);
  });
}

// Reset high scores
async function resetHighScores() {
  await fs.writeFile(HIGHSCORE_FILE, JSON.stringify([], null, 2));
  console.log(chalk.green('High scores cleared!'));
}

// Get random word
function getRandomWord() {
  return words[Math.floor(Math.random() * words.length)];
}

// Play a game
async function playGame() {
  const word = getRandomWord();
  let guessedLetters = new Set();
  let wrongGuesses = 0;
  const maxWrongGuesses = 6;

  console.log(chalk.cyan('Welcome to Hangman!'));
  console.log(chalk.cyan('Guess the word by entering one letter at a time.'));

  while (wrongGuesses < maxWrongGuesses) {
    // Display current state
    console.log(hangmanArt[wrongGuesses]);
    const displayWord = word
      .split('')
      .map(letter => (guessedLetters.has(letter) ? chalk.green(letter) : '_'))
      .join(' ');
    console.log(chalk.cyan(`Word: ${displayWord}`));
    console.log(chalk.cyan(`Guessed letters: ${[...guessedLetters].join(', ') || 'None'}`));

    // Get player guess
    const { guess } = await inquirer.prompt([
      {
        type: 'input',
        name: 'guess',
        message: 'Enter a letter:',
        validate: input => {
          input = input.toLowerCase();
          return /^[a-z]$/.test(input) && !guessedLetters.has(input)
            ? true
            : 'Please enter a single, new letter (a-z).';
        },
      },
    ]);

    const letter = guess.toLowerCase();
    guessedLetters.add(letter);

    // Check if guess is correct
    if (word.includes(letter)) {
      console.log(chalk.green('Good guess!'));
    } else {
      wrongGuesses++;
      console.log(chalk.red('Wrong guess!'));
    }

    // Check if word is complete
    if (word.split('').every(letter => guessedLetters.has(letter))) {
      console.log(hangmanArt[wrongGuesses]);
      console.log(chalk.green(`Congratulations! You guessed "${word}"!`));
      const score = (maxWrongGuesses - wrongGuesses) * 10; // Score based on remaining guesses
      console.log(chalk.green(`Your score: ${score}`));
      const { name } = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Enter your name to save your score:',
          default: 'Player',
        },
      ]);
      await saveHighScore(score, name);
      return;
    }
  }

  // Game over
  console.log(hangmanArt[wrongGuesses]);
  console.log(chalk.red(`Game over! The word was "${word}".`));
}

program
  .command('play')
  .description('Start a new game')
  .action(() => playGame());

program
  .command('highscore')
  .description('View high scores')
  .action(() => showHighScores());

program
  .command('reset')
  .description('Clear high scores')
  .action(() => resetHighScores());

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
  console.log(chalk.cyan('Use the "play" command to start the game!'));
}
