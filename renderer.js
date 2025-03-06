const Calendar = tui.Calendar;
const calendar = new Calendar('#calendar', {
    defaultView: 'month',
    useDetailPopup: true,
    template: {
        monthDayname: dayname => `<span class="text-dark">${dayname.label}</span>`
    }
});

// ** 休日リスト（ローカル保存用）**
let holidays = JSON.parse(localStorage.getItem('holidays')) || [];
const workTimes = JSON.parse(localStorage.getItem('workTimes')) || {}; // 勤務時間データ

// ** 休日の色付け **
const applyHolidayStyles = () => {
    document.querySelectorAll('.tui-full-calendar-daygrid-cell').forEach(cell => {
        const date = cell.dataset.date;
        if (!date) return;
        const day = new Date(date).getDay();
        if (day === 0) cell.style.backgroundColor = 'rgba(255, 99, 71, 0.3)'; // 日曜
        if (day === 6) cell.style.backgroundColor = 'rgba(100, 149, 237, 0.3)'; // 土曜
        if (holidays.includes(date)) cell.style.backgroundColor = 'rgba(255, 165, 0, 0.4)'; // 休日
    });
};

// ** 休日リストの更新 **
const updateHolidays = () => {
    applyHolidayStyles();
    const holidayList = document.getElementById('holidayList');
    holidayList.innerHTML = '';
    holidays.forEach(holiday => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `${holiday} <button class="btn btn-sm btn-danger remove-holiday" data-date="${holiday}">削除</button>`;
        holidayList.appendChild(li);
    });
    document.querySelectorAll('.remove-holiday').forEach(button => {
        button.addEventListener('click', (e) => {
            const date = e.target.dataset.date;
            holidays = holidays.filter(d => d !== date);
            localStorage.setItem('holidays', JSON.stringify(holidays));
            updateHolidays();
        });
    });
};

document.getElementById('addHolidayBtn').addEventListener('click', () => {
    const holidayInput = document.getElementById('customHoliday').value;
    if (holidayInput && !holidays.includes(holidayInput)) {
        holidays.push(holidayInput);
        localStorage.setItem('holidays', JSON.stringify(holidays));
        updateHolidays();
    }
});

// ** カレンダーの日付をクリックして勤務時間を設定 **
calendar.on('clickSchedule', (event) => {
    const date = event.start.toISOString().split('T')[0];
    document.getElementById('selectedDate').value = date;
    document.getElementById('startTime').value = workTimes[date]?.start || "09:00";
    document.getElementById('endTime').value = workTimes[date]?.end || "18:00";
    new bootstrap.Modal(document.getElementById('workTimeModal')).show();
});

// ** 勤務時間を保存 **
document.getElementById('saveWorkTime').addEventListener('click', () => {
    const date = document.getElementById('selectedDate').value;
    workTimes[date] = {
        start: document.getElementById('startTime').value,
        end: document.getElementById('endTime').value
    };
    localStorage.setItem('workTimes', JSON.stringify(workTimes));
    updateCalendarWithWorkTimes();
    bootstrap.Modal.getInstance(document.getElementById('workTimeModal')).hide();
});

// ** カレンダーに勤務時間を反映 **
const updateCalendarWithWorkTimes = () => {
    calendar.clear();
    Object.entries(workTimes).forEach(([date, { start, end }]) => {
        calendar.createEvents([{
            id: date,
            calendarId: 'work',
            title: `勤務時間: ${start} - ${end}`,
            start: `${date}T${start}:00`,
            end: `${date}T${end}:00`,
            category: 'time',
            bgColor: '#FFA500',
            color: '#fff'
        }]);
    });
};

// ** Excel出力 **
document.getElementById('exportExcel').addEventListener('click', () => {
    const month = new Date().toISOString().slice(0, 7);
    const fileName = `${month}.xlsx`;
    const data = [];
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${month}-${String(day).padStart(2, '0')}`;
        const workTime = workTimes[date];
        const isHoliday = holidays.includes(date);
        if (isHoliday) {
            data.push({ 日付: date, 開始: "休日", 終了: "休日", 合計: "0:00" });
        } else if (workTime) {
            const [startHour, startMin] = workTime.start.split(':').map(Number);
            const [endHour, endMin] = workTime.end.split(':').map(Number);
            const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
            const totalTime = `${Math.floor(totalMinutes / 60)}:${(totalMinutes % 60).toString().padStart(2, '0')}`;
            data.push({ 日付: date, 開始: workTime.start, 終了: workTime.end, 合計: totalTime });
        } else {
            data.push({ 日付: date, 開始: "09:00", 終了: "18:00", 合計: "9:00" });
        }
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "勤務時間");
    XLSX.writeFile(workbook, fileName);
    alert(`Excelファイルを出力しました: ${fileName}`);
});

// ** 初回ロード時に適用 **
setTimeout(() => {
    updateCalendarWithWorkTimes();
    updateHolidays();
}, 500);