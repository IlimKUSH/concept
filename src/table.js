import { Fragment, useCallback, useEffect, useState } from 'react';
import * as XLSX from 'xlsx/xlsx.mjs';
import DatePicker from "react-datepicker";
import 'react-datepicker/dist/react-datepicker.css';
import { eachDayOfInterval, startOfMonth, endOfMonth, format } from 'date-fns';


function calculateTimeDifference(startTime, endTime) {
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    const difference = end.getTime() - start.getTime();
    return difference / (1000 * 60 * 60); // Разница в часах
}

const Table = () => {
    const [data, setData] = useState(null);
    const [factTime, setFactTime] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    const fetchIds = useCallback(() => {
        setIsLoading(true)
        fetch(`/ws/rest/com.axelor.apps.mycrm.db.WorkSchedule/${id}/fetch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "X-Csrf-Token": "34c22bd64edf4fe8a5491eca7e9a01b4",
                // Cookie: "JSESSIONID=8785FB25769E7B6D4B75038F13CF5C4E; CSRF-TOKEN=534b6a570e92423a940d6086318a0ac1",
                "Authorization":"Basic Y29uY2VwdDpjb25jZXB0MTIz"
            },
            credentials: "include",
            body: JSON.stringify({})
        })
            .then((res) => res.json())
            .then((jsonData) => {
                const ids = jsonData.data[0]?.workScheduleLineList?.map(item => item.id);
                if (ids?.length > 0) {
                    return fetch("/ws/rest/com.axelor.apps.mycrm.db.WorkScheduleLine/search", {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            "X-Csrf-Token": "34c22bd64edf4fe8a5491eca7e9a01b4",
                            "Authorization": "Basic Y29uY2VwdDpjb25jZXB0MTIz"
                        },
                        credentials: "include",
                        body: JSON.stringify({
                            data: {
                                criteria: [
                                    {
                                        fieldName: "id",
                                        operator: "in",
                                        value: ids
                                    }
                                ]
                            }
                        })
                    });
                }
            })
            .then((res) => res.json())
            .then((jsonData) => {
                setIsLoading(false)
                setData(jsonData)
            })
            .catch((error) => console.error(error))
    }, []);

    useEffect(() => {
        fetchIds();
    }, []);


    const uniqueDates = [...new Set(data?.data?.map(item => item.date))].reverse();

    console.log(uniqueDates[0])

    const startDate2 = startOfMonth(new Date(2024, 0)); // начало января 2024 года
    const endDate2 = endOfMonth(new Date(2024, 0)); // конец января 2024 года

// Получаем массив всех дней месяца
    const allDaysOfMonth = eachDayOfInterval({ start: startDate2, end: endDate2 });

// Преобразуем даты в формат, который соответствует формату в вашем массиве uniqueDates
    const formattedAllDaysOfMonth = allDaysOfMonth.map(date => format(date, 'yyyy-MM-dd'));

// Объединяем массивы uniqueDates и formattedAllDaysOfMonth, затем создаем уникальный массив с помощью Set и преобразуем обратно в массив
    const allUniqueDates = [...new Set([ ...formattedAllDaysOfMonth, ...uniqueDates])];

    const startDate = allUniqueDates[0];
    const endDate = allUniqueDates[allUniqueDates.length - 1];

    useEffect(() => {
        if (data?.data?.length > 0) {
            fetch("/ws/rest/com.axelor.apps.mycrm.db.Attendance/search", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "X-Csrf-Token": "34c22bd64edf4fe8a5491eca7e9a01b4",
                    "Authorization": "Basic Y29uY2VwdDpjb25jZXB0MTIz"
                },
                credentials: "include",
                body: JSON.stringify({
                    data: {
                        criteria: [
                            {
                                operator: "or",
                                criteria: [
                                    {
                                        fieldName: "comingTime",
                                        operator: "between",
                                        value: startDate,
                                        value2: endDate
                                    },
                                    {
                                        fieldName: "leaveTime",
                                        operator: "between",
                                        value: startDate,
                                        value2: endDate
                                    }
                                ]
                            }
                        ]
                    },
                    sortBy: ["leaveTime","comingTime"]
                })
            })
                .then((res) => res.json())
                .then((response) => {
                    setFactTime(response)
                })
                .catch((error) => console.error(error))
        }
    }, [data]);

    const handleTimeChange = debounce((startTime, endTime, id, version) => {
        setIsLoading(true)

        fetch(`/ws/rest/com.axelor.apps.mycrm.db.WorkScheduleLine/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "X-Csrf-Token": "34c22bd64edf4fe8a5491eca7e9a01b4",
                "Authorization": "Basic Y29uY2VwdDpjb25jZXB0MTIz"
            },
            credentials: "include",
            body: JSON.stringify({
                data: {
                    id,
                    version,
                    startTime,
                    endTime
                }
            })
        })
            .then(() => {
                setIsLoading(false)
                fetchIds()
            })
            .catch((error) => console.error(error))
    }, 500)

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    const factTimeByEmployeeAndDate = {};
    factTime?.data?.forEach(item => {
        const formattedComingTime = new Date(item.comingTime).toISOString().split('T')[0];
        const formattedLeaveTime = new Date(item.leaveTime).toISOString().split('T')[0];

        if (!factTimeByEmployeeAndDate[item.employee.name]) {
            factTimeByEmployeeAndDate[item.employee.name] = {};
        }
        factTimeByEmployeeAndDate[item.employee.name][formattedComingTime] = item;
        factTimeByEmployeeAndDate[item.employee.name][formattedLeaveTime] = item;
    });

// Маппинг данных с использованием объектов для быстрого доступа
    const combinedData = data?.data?.map(employeeData => {
        const matchingItem = factTimeByEmployeeAndDate[employeeData.employee.name]?.[employeeData.date];

        return {
            ...employeeData,
            comingTime: !!matchingItem?.comingTime ? format(new Date(matchingItem.comingTime), "HH:mm") : null,
            leaveTime: !!matchingItem?.leaveTime ? format(new Date(matchingItem.leaveTime), "HH:mm") : null
        };
    });

    // const combinedData = data?.data?.map(employeeData => {
    //     const matchingItem = factTime?.data?.find(item => {
    //         // Конвертируем comingTime в нужный формат и сравниваем с датой из основного массива
    //         const formattedComingTime = new Date(item.comingTime).toISOString().split('T')[0];
    //         const formattedLeaveTime = new Date(item.leaveTime).toISOString().split('T')[0];
    //
    //         return item.employee.name === employeeData.employee.name && (formattedComingTime === employeeData.date || formattedLeaveTime === employeeData.date);
    //     });
    //
    //     return {
    //         ...employeeData,
    //         newComingTime: !!matchingItem?.comingTime && format(new Date(matchingItem.comingTime), "HH:mm"),
    //         newLeaveTime: !!matchingItem?.leaveTime && format(new Date(matchingItem.leaveTime), "HH:mm")
    //     };
    // });

    const uniqueEmployeeNames = new Set(data?.data?.map(employeeData => employeeData.employee.name)); // Получаем уникальные имена сотрудников
    const uniqueDepartments = [...new Set(data?.data?.map(employeeData => employeeData.department.name))]

    function isWeekend(date) {
        const dayOfWeek = date.getDay(); // Получаем день недели (0 - воскресенье, 1 - понедельник, ..., 6 - суббота)
        return dayOfWeek === 0 || dayOfWeek === 6; // Возвращаем true, если день является воскресеньем (0) или субботой (6)
    }

    const tableRows = [];

    uniqueDepartments.forEach((departmentName, deptIndex) => {
        tableRows.push(
            <tr key={deptIndex}>
                <td bgcolor="#8CB5F9" className="sticky">
                    <strong>{departmentName}</strong>
                </td>
            </tr>
        );

        uniqueEmployeeNames.forEach((employeeName, _) => {
            const totalPlanTimes = {};
            const totalFactTimes = {};

            combinedData?.forEach((item) => {
                const { employee, startTime, endTime } = item;
                const timeDifference = calculateTimeDifference(startTime, endTime); // Функция для вычисления разницы планового времени
                if (!totalPlanTimes[employee.name]) {
                    totalPlanTimes[employee.name] = timeDifference;
                } else {
                    totalPlanTimes[employee.name] += timeDifference;
                }
            });

            combinedData?.forEach((item) => {
                const { employee, comingTime, leaveTime } = item;
                const timeDifference = calculateTimeDifference(comingTime, leaveTime); // Функция для вычисления разницы фактического времени
                if (!totalFactTimes[employee.name]) {
                    totalFactTimes[employee.name] = timeDifference;
                } else {
                    totalFactTimes[employee.name] += timeDifference;
                }
            });

            const employeeData = combinedData?.find(item => item.employee.name === employeeName && item.department.name === departmentName); // Находим первое вхождение данных для данного сотрудника

            const totalPlanTime = totalPlanTimes[employeeName] || 0; // Получаем сумму планового времени для текущего сотрудника
            const totalFactTime = totalFactTimes[employeeName] || 0; // Получаем сумму фактического времени для текущего сотрудника
            const totalPercentage = (totalFactTime / totalPlanTime).toFixed(2)

            if (employeeData) {
                tableRows.push(
                    <tr key={employeeName} className="row">
                        <td className="sticky">
                            <div className="employee">
                                {employeeData.employee.name}
                            </div>
                        </td>
                        {/* Выводим имя сотрудника в первом столбце строки */}
                        {allUniqueDates.map((date, colIndex) => {
                            const employee = combinedData?.find(item => item.date === date && item.employee.name === employeeName && item.department.name === departmentName);

                            const isWeekendDay = isWeekend(new Date(date))
                            const startTime = new Date(`1970-01-01T${employee?.startTime}`)
                            const endTime = new Date(`1970-01-01T${employee?.endTime}`)

                            return (
                                <Fragment key={colIndex}>
                                    <td colSpan={1}>
                                        {/*{employee && !isWeekendDay &&*/}
                                        {/*    <div className="head-tab-time">*/}
                                        {/*        <div hidden>{employee.startTime?.slice(0, -3)}</div>*/}
                                        {/*        <DatePicker*/}
                                        {/*            disabled={isLoading}*/}
                                        {/*            selected={startTime}*/}
                                        {/*            showTimeSelect*/}
                                        {/*            showTimeSelectOnly*/}
                                        {/*            timeCaption="Time"*/}
                                        {/*            timeIntervals={10}*/}
                                        {/*            dateFormat="HH:mm"*/}
                                        {/*            timeFormat="HH:mm"*/}
                                        {/*            className="time pointer"*/}
                                        {/*            onChange={(time) => handleTimeChange(time, employee.endTime, employee.id, employee.version)}*/}
                                        {/*        />*/}
                                        {/*        <div>-</div>*/}
                                        {/*        <div hidden>{employee.endTime?.slice(0, -3)}</div>*/}
                                        {/*        <DatePicker*/}
                                        {/*            disabled={isLoading}*/}
                                        {/*            selected={endTime}*/}
                                        {/*            showTimeSelect*/}
                                        {/*            showTimeSelectOnly*/}
                                        {/*            timeCaption="Time"*/}
                                        {/*            timeIntervals={10}*/}
                                        {/*            dateFormat="HH:mm"*/}
                                        {/*            timeFormat="HH:mm"*/}
                                        {/*            className="time pointer"*/}
                                        {/*            onChange={(time) => handleTimeChange(employee?.startTime, time, employee.id, employee.version)}*/}
                                        {/*        />*/}
                                        {/*    </div>*/}
                                        {/*}*/}
                                        {employee &&
                                            <div className="head-tab-time">
                                                <div hidden>{employee.startTime?.slice(0, -3)}</div>
                                                <DatePicker
                                                    disabled={isLoading}
                                                    selected={startTime}
                                                    showTimeSelect
                                                    showTimeSelectOnly
                                                    timeCaption="Time"
                                                    timeIntervals={10}
                                                    dateFormat="HH:mm"
                                                    timeFormat="HH:mm"
                                                    className="time pointer"
                                                    onChange={(time) => handleTimeChange(time, employee.endTime, employee.id, employee.version)}
                                                />
                                                <div>-</div>
                                                <div hidden>{employee.endTime?.slice(0, -3)}</div>
                                                <DatePicker
                                                    disabled={isLoading}
                                                    selected={endTime}
                                                    showTimeSelect
                                                    showTimeSelectOnly
                                                    timeCaption="Time"
                                                    timeIntervals={10}
                                                    dateFormat="HH:mm"
                                                    timeFormat="HH:mm"
                                                    className="time pointer"
                                                    onChange={(time) => handleTimeChange(employee?.startTime, time, employee.id, employee.version)}
                                                />
                                            </div>
                                        }
                                    </td>
                                    <td colSpan={1}>
                                    {/*{employee && !isWeekendDay &&*/}
                                    {/*        <div className="head-tab-time">*/}
                                    {/*            {employee.comingTime && !isWeekendDay && <span className="time">{employee.comingTime}</span>}*/}
                                    {/*            <div>-</div>*/}
                                    {/*            {employee.leaveTime && !isWeekendDay && <span className="time">{employee.leaveTime}</span>}*/}
                                    {/*        </div>*/}
                                    {/*}*/}
                                    {employee &&
                                            <div className="head-tab-time">
                                                {employee.comingTime && !isWeekendDay && <span className="time">{employee.comingTime}</span>}
                                                <div>-</div>
                                                {employee.leaveTime && !isWeekendDay && <span className="time">{employee.leaveTime}</span>}
                                            </div>
                                    }
                                    </td>
                                </Fragment>
                            );
                        })}
                        <td colSpan={1}>
                            <div className="total">{totalPlanTime.toFixed(2)}</div>
                        </td>
                        <td colSpan={1}>
                            <div className="total">{totalFactTime.toFixed(2)}</div>
                        </td>
                        <td colSpan={1}>
                            <div className="total">{totalPercentage}</div>
                        </td>
                    </tr>
                );
            }
        });
    });

    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.table_to_sheet(document.querySelector('.table'));

        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

        XLSX.writeFile(wb, `work-schedule.xlsx`);
    };

//     function getAllDatesInMonth(year, month) {
//         const daysInMonth = new Date(year, month + 1, 0).getDate();
//         const allDates = [];
//         for (let day = 1; day <= daysInMonth; day++) {
//             allDates.push(new Date(year, month, day));
//         }
//         return allDates;
//     }
//
// // Создаем массив всех дат в указанном месяце и году
//     const year = 2024; // Замените на актуальный год
//     const month = 0; // Замените на актуальный месяц (0 для января, 1 для февраля и т.д.)
//     const allDatesInRange = getAllDatesInMonth(year, month);

    // const uniqueDatesWithWeekends = uniqueDates.map((date, index) => {
    //     const isWeekendDay = isWeekend(new Date(date));
    //     return { date, isWeekendDay };
    // });

    // console.log(allDatesInRange)

    return (
        <div>
            <table border={1} className="table">
                <thead>
                <tr>
                    <th></th>
                    {/*{uniqueDatesWithWeekends?.map((date, index) => (*/}
                    {/*    <th key={index} colSpan={2}>*/}
                    {/*        <div className="head-date">*/}
                    {/*            {date.date}*/}
                    {/*        </div>*/}
                    {/*    </th>*/}
                    {/*))}*/}
                    {allUniqueDates.map((date, index) => {
                        console.log(format(date, "yyyy-MM-dd"))
                        return (
                            <th key={index} colSpan={2}>
                                <div className="head-date">
                                    {date}
                                </div>
                            </th>
                        );
                    })}
                    <th colSpan={3}>
                        <div>
                            Всего
                        </div>
                    </th>
                </tr>
                <tr>
                    <th></th>
                    {allUniqueDates?.map((date) => (
                        <Fragment key={date}>
                            <th colSpan={1}>
                                <div className="head-tab">план</div>
                            </th>
                            <th colSpan={1}>
                                <div className="head-tab">факт</div>
                            </th>
                        </Fragment>
                    ))}
                    <th colSpan={1} width={150}>
                        <div>план, час</div>
                    </th>
                    <th colSpan={1} width={150}>
                        <div>факт, час</div>
                    </th>
                    <th colSpan={1} width={150}>
                        <div>% выполнения</div>
                    </th>
                </tr>
                </thead>
                <tbody>
                {tableRows}
                </tbody>
            </table>
            <button className="excel-btn" onClick={exportToExcel}>Export to Excel</button>
        </div>
    );
};

export default Table;