def state_of_water(temperature):
    """The state of water at a temperature in °C: "ice", "water" or "steam"."""
    if temperature < 0:
        return "ice"
    elif temperature >= 100:
        return "steam"
    else:
        return "water"

for temperature in [-20, 0, 25, 99.9, 100, 250]:
    print(temperature, "°C:", state_of_water(temperature))
