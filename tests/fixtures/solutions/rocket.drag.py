import math

G = 9.81

def rocket_flight(dry_mass, fuel_mass, burn_rate, exhaust_speed, drag=0.0, dt=0.002):
    """A rocket flying straight up through air, until it lands.

    drag is the constant k in the drag force k·v² (in kg/m).
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

for k in [0.0, 0.002]:
    times, heights, speeds, masses = rocket_flight(1.0, 0.5, 0.1, 300.0, drag=k)
    print(f"drag = {k:<6} highest {max(heights):6.1f} m   top speed {max(speeds):5.1f} m/s   lands at {-speeds[-1]:5.1f} m/s")
