// IMPORT HANDLER - Simplified Version
importBtn.onclick = () => {
    console.log("[IMPORT] Button clicked");
    importInput.click();
};

importInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log("[IMPORT] File:", file.name);
    importBtn.disabled = true;
    importBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Processing...';

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        console.log(`[IMPORT] Rows: ${rows.length}`);
        console.log("[IMPORT] Columns:", Object.keys(rows[0] || {}));

        if (rows.length === 0) {
            alert("Excel file is empty!");
            return;
        }

        let added = 0, skipped = 0;
        const allStudents = await db.students.toArray();
        const phones = new Set(allStudents.map(s => String(s.phone)).filter(p => p && p !== ''));
        const nics = new Set(allStudents.map(s => String(s.nic)).filter(n => n && n !== ''));
        const year = parseInt(document.getElementById('import-year-select').value);

        let maxId = 0;
        allStudents.filter(s => s.examYear === year).forEach(s => {
            const num = parseInt(String(s.studentId).substring(4)) || 0;
            if (num > maxId) maxId = num;
        });

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            const name = r.Name || r.name || r['Student Name'] || '';
            let phone = String(r.Phone || r.phone || r.Mobile || '').trim().split('.')[0];
            let nic = String(r.NIC || r.nic || '').trim();

            console.log(`Row ${i + 1}: ${name} | ${phone} | ${nic}`);

            if (!name) { skipped++; continue; }
            if (!phone && !nic) { skipped++; continue; }
            if ((phone && phones.has(phone)) || (nic && nics.has(nic))) { skipped++; continue; }

            maxId++;
            const sid = `${year}${String(maxId).padStart(4, '0')}`;

            await db.students.add({
                studentId: sid,
                name: name.trim(),
                phone: phone || '',
                nic: nic || '',
                parentPhone: String(r.ParentPhone || r.parentPhone || '').trim(),
                district: String(r.District || r.district || '').trim(),
                school: String(r.School || r.school || '').trim(),
                address: String(r.Address || r.address || '').trim(),
                birthday: String(r.Birthday || r.birthday || '').trim(),
                examYear: year,
                status: 'Active'
            });

            if (phone) phones.add(phone);
            if (nic) nics.add(nic);
            added++;
        }

        alert(`Import Done!\n✅ Added: ${added}\n⚠️ Skipped: ${skipped}`);
        loadStudents();
        importInput.value = "";
    } catch (err) {
        console.error("[IMPORT] Error:", err);
        alert("Import failed: " + err.message);
    } finally {
        importBtn.disabled = false;
        importBtn.innerHTML = '<i class="fa-solid fa-file-import mr-2 text-indigo-600"></i> Import Excel';
    }
};
