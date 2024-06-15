import { supabase } from "@/app/config/db";
import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';

// Function to test the connection (for development use only, remove in production)
async function testConnection() {
    const { data, error } = await supabase.from('users').select().limit(1);
    
    if (error) {
        console.error('Error connecting to the database:', error.message);
    } else {
        console.log('Successfully connected to the database:', data);
    }
}

// Call the function to test the connection (for development use only, remove in production)
testConnection();

export async function POST(request) {
    try {
        const { name, email, password } = await request.json();

        if (!name || !email || !password) {
            return NextResponse.json({ status: 400, message: 'Fill All the Fields' });
        }

        // Check if the user already exists in the database
        const { data: existingUser, error: userCheckError } = await supabase
            .from('users')
            .select('email', { count: 'exact' })
            .eq('email', email);

        if (userCheckError) {
            console.error("Error checking user existence:", userCheckError);
            return NextResponse.json({ status: 500, message: 'Error checking user existence' });
        }

        if (existingUser && existingUser.length > 0) {
            return NextResponse.json({ status: 400, message: 'This Account Already Exists' });
        }

        // Hash the password before saving it
        const saltRounds = 10; // bcrypt default salt rounds
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert a new user
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({ name, email, password: hashedPassword });

        if (insertError) {
            console.error("Error inserting new user:", insertError);
            return NextResponse.json({ status: 500, message: 'Your request cannot be submitted. Try Again Later!' });
        }

        return NextResponse.json({ status: 200, message: 'Your Account has been created', data: newUser });

    } catch (error) {
        console.error("Error occurred:", error); // Log the error
        return NextResponse.json({ message: "Failed", status: 500 });
    }
}