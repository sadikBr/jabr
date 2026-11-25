def kinetic_energy(mass, speed):
    """Kinetic energy in joules, for a mass in kg moving at a speed in m/s."""
    return 0.5 * mass * speed**2

print("A tennis serve:", kinetic_energy(0.058, 50), "J")
print("A cyclist:     ", kinetic_energy(80, 8), "J")
print("A car:         ", kinetic_energy(1200, 25), "J")
