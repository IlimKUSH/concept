import { Fragment, useCallback, useEffect, useState } from 'react';
import { eachDayOfInterval, startOfMonth, endOfMonth, format } from 'date-fns';
import TimepickerTd from "./components/datepicker";
import 'react-datepicker/dist/react-datepicker.css';

export function debounce(func, wait) {
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

function calculateTimeDifference(startTime, endTime) {
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    const difference = end.getTime() - start.getTime();
    return difference / (1000 * 60 * 60); // Разница в часах
}

const Table = () => {
    const [userData, setUserData] = useState(null);
    const [data, setData] = useState(null);
    const [factTime, setFactTime] = useState(null);
    const [workTime, setWorkTime] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [theme, setTheme] = useState("light");

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    const fetchWorkTime = useCallback(() => {
        fetch("/ws/rest/com.axelor.apps.directories.db.WorkingTime/search", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "X-Csrf-Token": "34c22bd64edf4fe8a5491eca7e9a01b4",
                "Authorization": "Basic Y29uY2VwdDpjb25jZXB0MTIz"
            },
            credentials: "include",
            body: JSON.stringify({
                sortBy: ["startTime"]
            })
        })
            .then((res) => res.json())
            .then((jsonData) => {
                setWorkTime(jsonData)
            })
    }, [])

    const fetchUserData = useCallback(() => {
        fetch("/ws/app/info", {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                "X-Csrf-Token": "34c22bd64edf4fe8a5491eca7e9a01b4",
                "Authorization": "Basic Y29uY2VwdDpjb25jZXB0MTIz"
            },
            credentials: "include",
        })
            .then((res) => res.json())
            .then((jsonData) => {
                const id = jsonData?.["user.id"]
                const theme = jsonData?.["application.theme"]
                setTheme(theme)
                if (id) {
                    fetch(`https://concept.sanarip.org/concept/ws/rest/com.axelor.auth.db.User/${id}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            "X-Csrf-Token": "34c22bd64edf4fe8a5491eca7e9a01b4",
                            "Authorization": "Basic Y29uY2VwdDpjb25jZXB0MTIz"
                        },
                        credentials: "include",
                    })
                        .then((res) => res.json())
                        .then((jsonData) => {
                            const editable = jsonData.data[0]?.roles?.some(role => role.name === 'Hr')
                            setUserData({...jsonData.data[0], editable})
                        })
                }
            })
    }, [])

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
                setData(jsonData)
            })
            .finally(() =>
                setIsLoading(false)
            )
            .catch((error) => console.error(error))
    }, []);

    useEffect(() => {
        fetchWorkTime();
        fetchUserData();
        fetchIds();
    }, []);

    useEffect(() => {
        if (theme === "dark") {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [theme]);


    const uniqueDates = [...new Set(data?.data?.map(item => item.date))].reverse();

    const actualYear = uniqueDates[0]?.split('-')[0]
    const actualMonth = uniqueDates[0]?.split('-')[1]

    const startDate2 = startOfMonth(new Date(actualYear, actualMonth - 1)); // начало месяца актуального года
    const endDate2 = endOfMonth(new Date(actualYear, actualMonth - 1)); // конец месяца актуального года

// Получаем массив всех дней месяца
    const allDaysOfMonth = eachDayOfInterval({ start: startDate2, end: endDate2 });

// Преобразуем даты в формат, который соответствует формату в вашем массиве uniqueDates
    const formattedAllDaysOfMonth = allDaysOfMonth.map(date => format(date, 'yyyy-MM-dd'));

    const allUniqueDates = [...new Set([...formattedAllDaysOfMonth])];

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
                    fields: [
                        "employee.contactPartner.companyDepartment",
                        "employee",
                        "comingTime",
                        "leaveTime"
                    ],
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

    const uniqueEmployeeNames = new Set(data?.data?.map(employeeData => employeeData.employee.name)); // Получаем уникальные имена сотрудников
    const uniqueDepartments = [...new Set(data?.data?.map(employeeData => employeeData.department.name))]

    const tableRows = [];

    uniqueDepartments.forEach((departmentName, deptIndex) => {
        tableRows.push(
            <tr key={deptIndex}>
                <td className="sticky department-bg">
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
                if (!totalPlanTimes[employee?.name]) {
                    totalPlanTimes[employee?.name] = timeDifference;
                } else {
                    totalPlanTimes[employee?.name] += timeDifference;
                }
            });

            combinedData?.forEach((item) => {
                const { employee, comingTime, leaveTime } = item;
                const timeDifference = calculateTimeDifference(comingTime, leaveTime); // Функция для вычисления разницы фактического времени
                if (!totalFactTimes[employee?.name]) {
                    totalFactTimes[employee?.name] = timeDifference;
                } else {
                    totalFactTimes[employee?.name] += timeDifference;
                }
            });

            const employeeData = combinedData?.find(item => item.employee?.name === employeeName && item.department?.name === departmentName); // Находим первое вхождение данных для данного сотрудника

            const totalPlanTime = totalPlanTimes[employeeName] || 0; // Получаем сумму планового времени для текущего сотрудника
            const totalFactTime = totalFactTimes[employeeName] || 0; // Получаем сумму фактического времени для текущего сотрудника
            const totalPercentage = (totalFactTime / totalPlanTime).toFixed(2)

            if (employeeData) {
                tableRows.push(
                    <tr key={employeeName} className="row">
                        <td className="sticky employee-bg">
                            <div className="employee">
                                {employeeData.employee.name}
                            </div>
                        </td>
                        {/* Выводим имя сотрудника в первом столбце строки */}
                        {allUniqueDates.map((date, colIndex) => {
                            const employee = combinedData?.find(item => item.date === date && item.employee?.name === employeeName && item.department?.name === departmentName);

                            return (
                                <Fragment key={colIndex}>
                                    <TimepickerTd employee={employee} userData={userData} workTime={workTime}
                                                fetchIds={() => fetchIds()} />
                                    <td colSpan={1}>
                                    {employee &&
                                            <div className="head-tab-time">
                                                {employee?.comingTime && <span className="time">{employee?.comingTime}</span>}
                                                <div>-</div>
                                                {employee?.leaveTime && <span className="time">{employee?.leaveTime}</span>}
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

    if (isLoading) {
        return <div className="loader-parent">
            <div className="loader"></div>
        </div>
    }

    return (
        <table border={1} className="table">
            <thead>
            <tr>
                <th></th>
                {allUniqueDates.map((date, index) => (
                        <th key={index} colSpan={2}>
                            <div className="head-date">
                                {date}
                            </div>
                        </th>
                    )
                )}
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
    );
};

export default Table;