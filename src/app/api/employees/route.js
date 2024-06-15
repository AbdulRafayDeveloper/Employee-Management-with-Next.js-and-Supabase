import { supabase } from "@/app/config/db";
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function POST(request) {
    try {
        const formData = await request.formData();

        const name = formData.get("name");
        const email = formData.get("email");
        const salary = formData.get("salary");
        const jobType = formData.get("jobType");
        const gender = formData.get("gender");
        const pic = formData.get("pic");
        const cv = formData.get("cv");

        if (!(name && email && salary && jobType && gender && pic && cv)) {
            return NextResponse.json({ status: 400, message: "Please fill in all the fields." });
        }

        // Check if the user already exists in the database
        const { data: existingUser, error: userCheckError } = await supabase
            .from('employees')
            .select('email')
            .eq('email', email)
            .single();

        if (userCheckError && userCheckError.code !== 'PGRST116') {
            console.error("Error checking user existence:", userCheckError);
            return NextResponse.json({ status: 500, message: 'Error checking user existence' });
        }

        if (existingUser) {
            return NextResponse.json({ status: 400, message: "Your request has already been submitted to Admin" });
        }

        // Insert a new employee
        const { data: newUser, error: insertError } = await supabase
            .from('employees')
            .insert([{ name, email, salary, jobType, gender }])
            .select('id')
            .single();

        if (insertError) {
            console.error("Error inserting new user:", insertError);
            return NextResponse.json({ status: 500, message: "Your request could not be submitted. Try again later!" });
        }

        const userId = newUser.id; // Use id to get the new user ID

        // Pic //
        const picOrginalName = pic.name;
        const basePicName = picOrginalName.substring(0, picOrginalName.lastIndexOf(".")).replaceAll(" ", "_");
        const picExtension = picOrginalName.substring(picOrginalName.lastIndexOf("."));
        const picName = `${basePicName}_${userId}${picExtension}`;

        // Cv //
        const cvOrginalName = cv.name;
        const baseCvName = cvOrginalName.substring(0, cvOrginalName.lastIndexOf(".")).replaceAll(" ", "_");
        const cvExtension = cvOrginalName.substring(cvOrginalName.lastIndexOf("."));
        const cvName = `${baseCvName}_${userId}${cvExtension}`;

        // Run file writes and database update in parallel
        await Promise.all([
            fs.writeFile(path.join(process.cwd(), "public/assets/images", picName), Buffer.from(await pic.arrayBuffer())),
            fs.writeFile(path.join(process.cwd(), "public/assets/files", cvName), Buffer.from(await cv.arrayBuffer())),
            supabase
                .from('employees')
                .update({ pic: picName, cv: cvName })
                .eq('id', userId),
        ]);

        return NextResponse.json({ status: 200, message: 'Your request has been submitted' });
    } catch (error) {
        console.error("Error occurred:", error);
        return NextResponse.json({ message: "Failed", status: 500 });
    }
}

export async function GET(request) {
    try {
        const { data: employees, error } = await supabase
            .from('employees')
            .select('*');

        if (error) {
            console.error('An error occurred while retrieving the records:', error);
            return NextResponse.json({ status: 500, message: 'An error occurred while retrieving the records.' });
        }

        if (Array.isArray(employees) && employees.length > 0) {
            return NextResponse.json({ status: 200, message: 'Records found', data: employees });
        } else {
            return NextResponse.json({ status: 200, message: 'No Records found', data: [] });
        }
    } catch (error) {
        console.error('An error occurred while retrieving the records:', error);
        return NextResponse.json({ status: 500, message: 'An error occurred while retrieving the records.' });
    }
}