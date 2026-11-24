import matplotlib.pyplot as plt

G = 9.81

def rocket_flight(dry_mass, fuel_mass, burn_rate, exhaust_speed, drag=0.0, dt=0.002):
    """A rocket flying straight up through air, until it lands.

    Returns (times, heights, speeds, masses).
    """
    t, y, v = 0.0, 0.0, 0.0
    fuel = fuel_mass
    times, heights, speeds, masses = [t], [y], [v], [dry_mass + fuel]
    for _ in range(500_000):
        mass = dry_mass + fuel
        thrust = burn_rate * exhaust_speed if fuel > 0 else 0.0
        drag_force = -drag * v * abs(v)
        a = (thrust + drag_force) / mass - G
        y += v * dt
        v += a * dt
        fuel = max(fuel - burn_rate * dt, 0.0)
        t += dt
        times.append(t)
        heights.append(y)
        speeds.append(v)
        masses.append(dry_mass + fuel)
        if y < 0:
            break
    return times, heights, speeds, masses

def apogee(fuel_mass, dry_mass=1.0, burn_rate=0.1, exhaust_speed=300.0, drag=0.002):
    """The highest point the rocket reaches, in metres."""
    return max(rocket_flight(dry_mass, fuel_mass, burn_rate, exhaust_speed, drag=drag)[1])

def fuel_for_altitude(target, dry_mass=1.0, burn_rate=0.1, exhaust_speed=300.0, drag=0.002):
    """How many kg of fuel make the rocket's apogee equal the target height."""
    low, high = 0.0, 2.0
    for _ in range(25):
        middle = (low + high) / 2
        if apogee(middle, dry_mass, burn_rate, exhaust_speed, drag) > target:
            high = middle
        else:
            low = middle
    return (low + high) / 2

target = 400.0
fuel = fuel_for_altitude(target)
print(f"To reach {target:.0f} m, load {fuel:.3f} kg of fuel.")
print(f"That flight peaks at {apogee(fuel):.1f} m.")

times, heights, speeds, masses = rocket_flight(1.0, fuel, 0.1, 300.0, drag=0.002)
plt.plot(times, heights)
plt.axhline(target, linestyle="--", color="gray")
plt.xlabel("time (s)")
plt.ylabel("altitude (m)")
plt.title("Rocket flight")
plt.show()
