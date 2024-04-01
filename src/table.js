import { Fragment, useCallback, useEffect, useState } from 'react';
import * as XLSX from 'xlsx/xlsx.mjs';

function calculateTimeDifference(startTime, endTime) {
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    const difference = end.getTime() - start.getTime();
    return difference / (1000 * 60 * 60); // Разница в часах
}

const Table = () => {
    const [data, setData] = useState(null);
    const [idsData, setIdsData] = useState(null);
    const [factTime, setFactTime] = useState(null);
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    const fetchIds = useCallback(() => {
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
                setIdsData(jsonData.data[0]?.workScheduleLineList?.map(item => item.id))
            })
            .catch((error) => console.error(error))
    }, []);

    useEffect(() => {
        fetchIds();
    }, []);

    useEffect(() => {
        if (idsData?.length > 0) {
            fetch("/ws/rest/com.axelor.apps.mycrm.db.WorkScheduleLine/search", {
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
                                value: idsData
                            }
                        ]
                    }
                })
            })
                .then((res) => res.json())
                .then((response) => {
                    setData(response)
                })
                .catch((error) => console.error(error))
        }
    }, [idsData])

    const uniqueDates = [...new Set(data?.data?.map(item => item.date))];

    const startDate = uniqueDates[uniqueDates.length - 1];
    const endDate = uniqueDates[0];

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

    const handleTimeChange = (startTime, endTime, id, version) => {
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
                fetchIds()
            })
            .catch((error) => console.error(error))
    };

    const combinedData = data?.data?.map(employeeData => {
        const matchingItem = factTime?.data?.find(item => {
            // Конвертируем comingTime в нужный формат и сравниваем с датой из основного массива
            const formattedComingTime = new Date(item.comingTime).toISOString().split('T')[0];

            return item.employee.name === employeeData.employee.name && formattedComingTime === employeeData.date;
        });

        return {
            ...employeeData,
            newComingTime: matchingItem ? matchingItem.comingTime?.substring(11,16) : null,
            newLeaveTime: matchingItem ? matchingItem.leaveTime?.substring(11,16) : null
        };
    });

    const uniqueEmployeeNames = new Set(data?.data?.map(employeeData => employeeData.employee.name)); // Получаем уникальные имена сотрудников
    const uniqueDepartments = [...new Set(data?.data?.map(employeeData => employeeData.department.name))]

    const tableRows = [];

    uniqueDepartments.forEach((departmentName, deptIndex) => {
        tableRows.push(
            <tr key={deptIndex}>
                <td bgcolor="#8CB5F9" className="sticky">
                    <strong>{departmentName}</strong>
                </td>
            </tr>
        );

        uniqueEmployeeNames.forEach((employeeName, i) => {
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
                const { employee, newComingTime, newLeaveTime } = item;
                const timeDifference = calculateTimeDifference(newComingTime, newLeaveTime); // Функция для вычисления разницы фактического времени
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
                    <tr key={i}>
                        <td bgcolor="#fff" className="sticky">
                            <div className="employee">
                                {employeeData.employee.name}
                            </div>
                        </td>
                        {/* Выводим имя сотрудника в первом столбце строки */}
                        {uniqueDates.reverse().map((date, colIndex) => {
                            const employee = combinedData?.find(item => item.date === date && item.employee.name === employeeName && item.department.name === departmentName);

                            return (
                                <Fragment key={colIndex}>
                                    <td colSpan={1}>
                                        {employee &&
                                            <div className="plan">
                                                <div hidden>{employee.startTime.slice(0, -3)}</div>
                                                <input type="time" value={employee.startTime} className="time"
                                                       onChange={(e) => handleTimeChange(e.target.value, employee.endTime, employee.id, employee.version)}/>
                                                <div>-</div>
                                                <div hidden>{employee.endTime.slice(0, -3)}</div>
                                                <input type="time" value={employee.endTime} className="time"
                                                       onChange={(e) => handleTimeChange(employee.startTime, e.target.value, employee.id, employee.version)}/>
                                            </div>
                                        }
                                    </td>
                                    <td colSpan={1}>
                                        {employee &&
                                            <div className="fact">
                                                {employee.newComingTime && <span className="time">{employee.newComingTime}</span>}
                                                <div>-</div>
                                                {employee.newLeaveTime && <span className="time">{employee.newLeaveTime}</span>}
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

        XLSX.writeFile(wb, `test.xlsx`);
    };

    return (
        <div>
            <table border={1} className="table">
                <thead>
                <tr>
                    <th></th>
                    {uniqueDates?.map((date, index) => (
                        <th key={index} colSpan={2}>
                            <div className="w300">
                                {date}
                            </div>
                        </th>
                    ))}
                    <th colSpan={3}>
                        <div>
                            Всего
                        </div>
                    </th>
                </tr>
                <tr>
                    <th></th>
                    {uniqueDates?.map((date) => (
                        <Fragment key={date}>
                            <th colSpan={1}>
                                <div className="w150">план</div>
                            </th>
                            <th colSpan={1}>
                                <div className="w150">факт</div>
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
            <button onClick={exportToExcel}>Export to Excel</button>
        </div>
    );
};

export default Table;