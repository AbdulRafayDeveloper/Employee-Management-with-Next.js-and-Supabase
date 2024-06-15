import { supabase } from "@/app/config/db";
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function DELETE(request, { params }) {
    try {
        const { id } = params;

        // Retrieve the employee's picture and CV
        const { data: employee, error: employeeError } = await supabase
            .from('employees')
            .select('pic, cv')
            .eq('id', id)
            .single();

        if (employeeError) {
            return NextResponse.json({ status: 404, message: 'Record not found.' });
        }

        const { pic: employeePic, cv: employeeCv } = employee;

        // Perform the delete operation
        const { data, error: deleteError } = await supabase
            .from('employees')
            .delete()
            .eq('id', id);

        if (deleteError) {
            return NextResponse.json({ status: 404, message: 'Record not deleted.' });
        }

        try {
            if (employeePic) {
                const picPath = path.join(process.cwd(), "public/assets/images/", employeePic);
                await fs.unlink(picPath);
            }
            if (employeeCv) {
                const cvPath = path.join(process.cwd(), "public/assets/files/", employeeCv);
                await fs.unlink(cvPath);
            }
        } catch (fileError) {
            console.error('Error deleting files:', fileError);
        }

        return NextResponse.json({ status: 200, message: 'Record deleted successfully.' });
    } catch (error) {
        console.error('An error occurred while processing the request:', error);
        return NextResponse.json({ status: 500, message: 'An error occurred while processing the request.' });
    }
}

export async function GET(request, { params }) {
    try {
        const { id } = params;
        const { data: employee, error } = await supabase
            .from('employees')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return NextResponse.json({ status: 404, message: 'No record found for the provided ID.' });
        }
        console.log("employee: ", employee);
        return NextResponse.json({ status: 200, message: 'Record found', data: employee });
    } catch (error) {
        console.error('An error occurred while retrieving the record:', error);
        return NextResponse.json({ status: 500, message: 'An error occurred while retrieving the record.' });
    }
}

export async function PUT(request, { params }) {
    try {
        const { id } = params;
        console.log("Id: ", id);
        const formData = await request.formData();

        const name = formData.get("name");
        const email = formData.get("email");
        const salary = formData.get("salary");
        const jobType = formData.get("jobType");
        const gender = formData.get("gender");
        const prePic = formData.get("prePic");
        const pic = formData.get("pic");
        const preCv = formData.get("preCv");
        const cv = formData.get("cv");

        if (!(name && email && salary && jobType && gender)) {
            return NextResponse.json({ status: 400, message: "Please fill in all the fields." });
        }

        let picName = prePic;
        let cvName = preCv;

        if (pic && pic.name) {
            console.log("pic: ", pic.name);
            console.log("Id 2: ", id);

            const prePicPath = path.join(process.cwd(), "public/assets/images/", prePic);
            await fs.unlink(prePicPath);

            const picOrginalName = pic.name;
            const basePicName = picOrginalName.substring(0, picOrginalName.lastIndexOf(".")).replaceAll(" ", "_");
            const picExtension = picOrginalName.substring(picOrginalName.lastIndexOf("."));
            picName = `${basePicName}_${id}${picExtension}`;

            await fs.writeFile(path.join(process.cwd(), "public/assets/images", picName), Buffer.from(await pic.arrayBuffer()));
        }

        if (cv && cv.name) {
            console.log("cv: ", cv.name);

            const preCvPath = path.join(process.cwd(), "public/assets/files/", preCv);
            await fs.unlink(preCvPath);

            const cvOrginalName = cv.name;
            const baseCvName = cvOrginalName.substring(0, cvOrginalName.lastIndexOf(".")).replaceAll(" ", "_");
            const cvExtension = cvOrginalName.substring(cvOrginalName.lastIndexOf("."));
            cvName = `${baseCvName}_${id}${cvExtension}`;

            await fs.writeFile(path.join(process.cwd(), "public/assets/files", cvName), Buffer.from(await cv.arrayBuffer()));
        }

        const { data, error } = await supabase
            .from('employees')
            .update({ name, email, salary, jobType, gender, pic: picName, cv: cvName })
            .eq('id', id);

        if (error) {
            return NextResponse.json({ status: 500, message: 'Failed to update the record.' });
        }

        return NextResponse.json({ status: 200, message: 'Your request has been submitted' });
    } catch (error) {
        console.error("Error occurred:", error);
        return NextResponse.json({ message: "Failed", status: 500 });
    }
}