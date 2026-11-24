import math

G = 9.81

def rocket_flight(dry_mass, fuel_mass, burn_rate, exhaust_speed, dt=0.002):
    """A rocket flying straight up, until it comes back to the ground.

    burn_rate is in kg of fuel per second; exhaust_speed is in m/s.
    Returns (times, heights, speeds, masses).
    """
    t, y, v = 0.0, 0.0, 0.0
    fuel = fuel_mass
    times, heights, speeds, masses = [t], [y], [v], [dry_mass + fuel]
    for _ in range(500_000):
        mass = dry_mass + fuel
        thrust = burn_rate * exhaust_speed if fuel > 0 else 0.0
        a = thrust / mass - G
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

times, heights, speeds, masses = rocket_flight(
    dry_mass=1.0, fuel_mass=0.5, burn_rate=0.1, exhaust_speed=300.0
)
print(f"Top speed: {max(speeds):6.1f} m/s")
print(f"Highest:   {max(heights):6.1f} m")
print(f"Flight:    {times[-1]:6.1f} s")
print(f"Rocket equation says the top speed should be {300.0 * math.log(1.5) - G * 5:.1f} m/s")
