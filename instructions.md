# Go Boat Go Overview
This is a game where the objective is to navigate a boat through a series of obstacles to collect fruits and return the fruits to the port. Each time the boat reaches the island the boat will collect a few fruits. Each time the boat collides with an obstacle they will lose some of the fruits from the recent trip and a heart. The player wins if they can return a set number of fruits at the port without running out of hearts.

# High Level Changes:
- Modify the code such that the objective is to retrieve 25 fruits from the island
- Each visit to the island the boat is given 3 fruits.
- When the boat hits an obstacle it loses 1 heart and a varied number of fruits from their recent trip.
- We will need a tracker to keep track of how many fruits are on the boat and how many fruits are in the port.
