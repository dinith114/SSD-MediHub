// Known test data for local security testing.
//
// Every account uses an obviously fake @test.local address so no real person is
// ever contacted, and the same password so the team can log in by hand.

import { User } from "../src/models/user.model.js";
import { Doctor } from "../src/models/doctor.model.js";
import { Medicine } from "../src/models/medicine.model.js";
import { UserCart } from "../src/models/UserCart.model.js";
import { Appointment } from "../src/models/appointment.model.js";

export const TEST_PASSWORD = "Passw0rd!123";

const patients = [
    { firstName: "Alice", lastName: "Adams", email: "alice@test.local", phone: "0770000001", gender: "Female" },
    { firstName: "Bobby", lastName: "Brown", email: "bobby@test.local", phone: "0770000002", gender: "Male" },
    { firstName: "Carol", lastName: "Clark", email: "carol@test.local", phone: "0770000003", gender: "Female" },
    { firstName: "Dana", lastName: "Davis", email: "dana@test.local", phone: "0770000004", gender: "Female" },
];

const doctorTemplate = {
    password: TEST_PASSWORD,
    address: { country: "Sri Lanka", city: "Colombo", pincode: "10000" },
    department: { name: "Oncology", description: "Cancer care" },
    specializations: [{ name: "Medical Oncology", description: "Chemotherapy" }],
    qualifications: ["MBBS", "MD"],
    experience: "10 years",
    availabelSlots: { days: ["Monday", "Wednesday"], hours: "09:00-12:00" },
    docAvatar: "https://example.invalid/avatar.png",
    role: "Doctor",
    languagesKnown: ["English", "Sinhala"],
    appointmentCharges: "3000",
};

const categories = ["Tablet", "Syrup", "Injection", "Drops", "Cream", "Powder", "Lotion", "Inhaler"];

// A catalogue big enough that "this search returned everything" is obvious on
// screen — the V-08 regex-injection demo depends on it.
function buildMedicines(count) {
    const list = [];
    for (let i = 1; i <= count; i++) {
        list.push({
            name: `Testomycin ${String(i).padStart(3, "0")}`,
            price: 100 + (i % 50),
            description: `Seeded test medicine number ${i} for local security testing.`,
            category: categories[i % categories.length],
            manufacturer: `Test Labs ${i % 7}`,
            expiryDate: new Date("2030-01-01"),
            stock: 50,
            image: "https://example.invalid/medicine.png",
            discount: i % 30,
        });
    }
    return list;
}

function cookieFor(account) {
    const names = { Admin: "adminToken", Patient: "patientToken", Doctor: "doctorToken" };
    return `${names[account.role]}=${account.generateJsonWebToken()}`;
}

export async function seed({ medicineCount = 500 } = {}) {
    await Promise.all([
        User.deleteMany({}), Doctor.deleteMany({}), Medicine.deleteMany({}),
        UserCart.deleteMany({}), Appointment.deleteMany({}),
    ]);

    const created = {};
    for (const p of patients) {
        created[p.firstName.toLowerCase()] = await User.create({
            ...p, password: TEST_PASSWORD, role: "Patient",
            dob: new Date("1995-05-05"), address: { city: "Colombo", country: "Sri Lanka" },
        });
    }
    created.admin = await User.create({
        firstName: "Adam", lastName: "Adminson", email: "admin@test.local", phone: "0770000009",
        password: TEST_PASSWORD, role: "Admin", gender: "Male", dob: new Date("1990-01-01"),
        address: { city: "Colombo", country: "Sri Lanka" },
    });

    created.alpha = await Doctor.create({
        ...doctorTemplate, firstName: "Alpha", lastName: "Anderson",
        email: "alpha@test.local", phone: "0780000001", gender: "Male",
    });
    created.beta = await Doctor.create({
        ...doctorTemplate, firstName: "Betty", lastName: "Beta",
        email: "beta@test.local", phone: "0780000002", gender: "Female",
    });

    const medicines = await Medicine.insertMany(buildMedicines(medicineCount));

    // Bobby's private cart row — the target for the IDOR check (V-13).
    const cart = await UserCart.create({
        userId: created.bobby._id, medicineId: medicines[0]._id,
        quantity: 3, totalPrice: 4500, status: "Pending",
    });

    // Alice's appointment with Dr Beta — Dr Alpha must not be able to touch it
    // (V-14, V-15).
    const appointment = await Appointment.create({
        patient: created.alice._id, patientFirstName: "Alice", patientLastName: "Adams",
        doctor: created.beta._id, doctorFirstName: "Betty", doctorLastName: "Beta",
        experience: "10 years", appointmentCharges: "3000",
        city: "Kandy", pincode: "20000", appointmentDate: new Date("2026-11-01"),
        department: "Oncology", status: "Pending",
    });

    const accounts = {};
    for (const [key, account] of Object.entries(created)) {
        accounts[key] = {
            id: String(account._id),
            email: account.email,
            role: account.role,
            cookie: cookieFor(account),
        };
    }

    return {
        password: TEST_PASSWORD,
        accounts,
        ids: {
            cartId: String(cart._id),
            appointmentId: String(appointment._id),
            medicineId: String(medicines[0]._id),
            medicineName: medicines[0].name,
            medicineCount: medicines.length,
        },
    };
}
