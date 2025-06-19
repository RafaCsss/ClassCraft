# ClassCraft - Educational RPG System

RPG-based gamification system for classrooms. Students create characters with classes and races, use abilities, form teams, and gain experience by completing tasks.

## Quick Start

```bash
npm install
node app.js
```

Open: http://localhost:3000

## Features

- **RPG Characters**: 3 classes (Mage, Warrior, Healer) and 3 races (Human, Elf, Dwarf)
- **Team System**: Max 4 students per team with shared points
- **Abilities**: General and class-specific skills with cooldowns
- **Classroom Management**: Teachers can modify student stats in real-time
- **Inventory**: Coins and items with different rarities

## Database

MongoDB with 18 collections for complete RPG functionality:
- User management and authentication
- Character progression and stats
- Team formation and management
- Mission and reward systems
- Real-time classroom interactions

## API Structure

```
POST /api/auth/register        # User registration
POST /api/auth/login          # User login
POST /api/personajes/crear    # Create character
GET  /api/clases/mis-clases   # View classes
POST /api/clases/unirse/:code # Join class
```

## Tech Stack

- Backend: Node.js + Express + MongoDB
- Frontend: HTML + CSS + JavaScript
- Auth: JWT + bcrypt

## Setup

1. Install dependencies: `npm install`
2. Run MongoDB locally
3. Start server: `node app.js`
4. **Initialize Database:** `GET http://localhost:3000/api/setup`
   - Automatically creates all 18 collections
   - Populates with test data (users, characters, classes, abilities)
   - Ready to use immediately!

Turn any classroom into a gamified RPG experience.
