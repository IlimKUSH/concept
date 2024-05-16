import {Fragment, useCallback, useEffect, useRef, useState} from 'react';
import {differenceInHours, eachDayOfInterval, endOfMonth, format, startOfMonth} from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';
import Timepicker from "./components/timepicker";
import ReactPaginate from "react-paginate";

const calculateTimeDifference = (endTime, startTime) => {
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    let diff = differenceInHours(end, start);

    if (diff < 0) {
        diff *= -1
    }

    if (diff === 9) {
        diff = 8;
    }

    return diff
}

const Table = () => {
    const [userData, setUserData] = useState(null);
    const [data, setData] = useState(null);
    const [limit, setLimit] = useState(null);
    const [itemOffset, setItemOffset] = useState(0);
    const [pageCount, setPageCount] = useState(0);
    const [factTime, setFactTime] = useState(null);
    const [workTime, setWorkTime] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [disabled, setDisabled] = useState(false);
    const [theme, setTheme] = useState("dark");

    const containerRef = useRef(null)

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
                sortBy: ["name"]
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
                            const editable = jsonData.data[0]?.roles?.some(role => role.name === 'Admin' || role.name === 'HR Manager')
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
                "Authorization": "Basic Y29uY2VwdDpjb25jZXB0MTIz"
            },
            credentials: "include",
            body: JSON.stringify({})
        })
            .then((res) => res.json())
            .then((jsonData) => {
                const ids = jsonData.data[0]?.workScheduleLineList?.map(item => item.id);
                const endDate = jsonData.data[0]?.endDate.split("-")[2]
                const limit = endDate * 15

                setDisabled(jsonData.data[0]?.isConfirmed)
                setLimit(limit)

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
                            limit,
                            offset: itemOffset,
                            sortBy:["department"],
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
            .finally(() => {
                setIsLoading(false)
            })
            .catch((error) => console.error(error))
    }, [id, itemOffset]);

    const handlePageClick = ({selected}) => {
        const newOffset = selected * limit;
        setPageCount(selected)
        setItemOffset(newOffset);
    };

    // Функция для обновления позиции горизонтального скролла и сохранения ее в локальное хранилище
    const updateScrollPosition = () => {
        if (containerRef.current != null) {
            const currentXPosition = containerRef.current.scrollLeft;
            const currentYPosition = containerRef.current.scrollTop;
            localStorage.setItem('horizontalScrollPosition', currentXPosition.toString());
            localStorage.setItem('verticalScrollPosition', currentYPosition.toString());
        }
    };

    // Обработчик события прокрутки, вызывающий функцию обновления позиции скролла
    useEffect(() => {
        if (!isLoading) {
            const container = containerRef.current;
            if (container != null) {
                const xPosition = localStorage.getItem('horizontalScrollPosition');
                const yPosition = localStorage.getItem('verticalScrollPosition');
                container.scroll(parseInt(xPosition), parseInt(yPosition));
                container.addEventListener('scroll', updateScrollPosition);
                return () => {
                    container.removeEventListener('scroll', updateScrollPosition);
                };
            }
        }
    }, [isLoading]);

    useEffect(() => {
        fetchWorkTime();
        fetchUserData();
    }, []);

    useEffect(() => {
        fetchIds();
    }, [itemOffset]);

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
    const allDaysOfMonth = eachDayOfInterval({start: startDate2, end: endDate2});

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
                        "leaveTime",
                        "date"
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
                    sortBy: ["leaveTime", "comingTime"]
                })
            })
                .then((res) => res.json())
                .then((response) => {
                    setFactTime(response)
                })
                .catch((error) => console.error(error))
        }
    }, [data, endDate, startDate]);

    const factTimeByEmployeeAndDate = {};
    factTime?.data?.forEach(item => {
        if (!factTimeByEmployeeAndDate[item.employee.name]) {
            factTimeByEmployeeAndDate[item.employee.name] = {};
        }
        factTimeByEmployeeAndDate[item.employee.name][item.date] = item;
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

    const uniqueEmployeeNames = new Set(data?.data?.map(employeeData => employeeData?.employee?.name)); // Получаем уникальные имена сотрудников
    const uniqueDepartments = [...new Set(data?.data?.map(employeeData => employeeData?.department?.name))]

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
                const {employee, startTime, endTime} = item;

                if (!!startTime && !!endTime) {
                    const timeDifference = calculateTimeDifference(endTime, startTime) // Функция для вычисления разницы планового времени

                    if (!totalPlanTimes[employee?.name]) {
                        totalPlanTimes[employee?.name] = timeDifference;
                    } else {
                        totalPlanTimes[employee?.name] += timeDifference;
                    }
                }
            });

            combinedData?.forEach((item) => {
                const {employee, comingTime, leaveTime} = item;

                if (!!comingTime && !!leaveTime) {
                    const timeDifference = calculateTimeDifference(leaveTime, comingTime); // Функция для вычисления разницы фактического времени

                    if (!totalFactTimes[employee?.name]) {
                        totalFactTimes[employee?.name] = timeDifference;
                    } else {
                        totalFactTimes[employee?.name] += timeDifference;
                    }
                }
            });

            const employeeData = combinedData?.find(item => item.employee?.name === employeeName && item.department?.name === departmentName); // Находим первое вхождение данных для данного сотрудника

            const totalPlanTime = totalPlanTimes[employeeName] || 0; // Получаем сумму планового времени для текущего сотрудника
            const totalFactTime = totalFactTimes[employeeName] || 0; // Получаем сумму фактического времени для текущего сотрудника
            const totalPercentage = totalPlanTime !== 0 ? ((totalFactTime / totalPlanTime) * 100).toFixed(2) : 0;

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
                                    <Timepicker
                                        disabled={disabled}
                                        employee={employee}
                                        userData={userData}
                                        workTime={workTime}
                                        fetchIds={() => fetchIds()}
                                    />
                                    <td colSpan={1}>
                                        {employee &&
                                            <div className="head-tab-time">
                                                {employee?.comingTime &&
                                                    <span className="time">{employee?.comingTime}</span>}
                                                <div>-</div>
                                                {employee?.leaveTime &&
                                                    <span className="time">{employee?.leaveTime}</span>}
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
        <div>
            <div className="container" ref={containerRef}>
                <table className="table">
                    <thead>
                    <tr>
                        <th className="sticky"></th>
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
                        <th className="sticky"></th>
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
            </div>
            <ReactPaginate
                nextLabel={<svg xmlns="http://www.w3.org/2000/svg" className="arrow" viewBox="0 0 24 24">
                    <path
                        d="m18.707 12.707-3 3a1 1 0 0 1-1.414-1.414L15.586 13H6a1 1 0 0 1 0-2h9.586l-1.293-1.293a1 1 0 0 1 1.414-1.414l3 3a1 1 0 0 1 0 1.414z"
                        data-name="Right"/>
                </svg>}
                onPageChange={handlePageClick}
                pageRangeDisplayed={3}
                marginPagesDisplayed={2}
                previousLabel={<svg xmlns="http://www.w3.org/2000/svg" className="arrow" viewBox="0 0 24 24">
                    <path
                        d="M19 12a1 1 0 0 1-1 1H8.414l1.293 1.293a1 1 0 1 1-1.414 1.414l-3-3a1 1 0 0 1 0-1.414l3-3a1 1 0 0 1 1.414 1.414L8.414 11H18a1 1 0 0 1 1 1z"
                        data-name="Left"/>
                </svg>}
                breakLabel="..."
                forcePage={pageCount}
                renderOnZeroPageCount={null}
                pageCount={Math.ceil(data?.total / limit)}
                pageClassName="page-item"
                pageLinkClassName="page-link"
                previousClassName="page-item"
                previousLinkClassName="page-link"
                nextClassName="page-item"
                nextLinkClassName="page-link"
                breakClassName="page-item"
                breakLinkClassName="page-link"
                containerClassName="pagination"
                activeClassName="active"
            />
        </div>
    );
};

export default Table;