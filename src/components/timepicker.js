import {useState} from 'react';
import DatePicker from "react-datepicker";
import {debounce} from "../hooks/useDebounce";
import {differenceInHours, isAfter} from "date-fns";


const Timepicker = ({disabled, employee, workTime, userData, fetchIds}) => {
    const [selectedOption, setSelectedOption] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    console.log(disabled)

    const startTime = employee?.startTime ? new Date(`1970-01-01T${employee?.startTime}`) : null
    const endTime = employee?.endTime ? new Date(`1970-01-01T${employee?.endTime}`) : null

    const handleTimeChange = debounce((startTime, endTime, id, version) => {
        setIsLoading(true)

        const start = typeof startTime === "string" ? new Date(`1970-01-01T${startTime}`) : startTime;
        const end = typeof endTime === "string" ? new Date(`1970-01-01T${endTime}`) : endTime;

        // Проверка, является ли время начала поздним вечерним
        const isLateEvening = isAfter(start, new Date(start?.getFullYear(), start?.getMonth(), start?.getDate(), 18, 0, 0));

        // Вычисление разницы в часах
        const timeDifference = differenceInHours(start, end);

        // Условие для установки isNightShift в true
        const isNightShift = isLateEvening && timeDifference >= 12;

        fetch(`/ws/rest/com.axelor.apps.mycrm.db.WorkScheduleLine/${id}`, {
            method: 'POST', headers: {
                'Content-Type': 'application/json',
                "X-Csrf-Token": "34c22bd64edf4fe8a5491eca7e9a01b4",
                "Authorization": "Basic Y29uY2VwdDpjb25jZXB0MTIz"
            }, credentials: "include", body: JSON.stringify({
                data: {
                    id, version, startTime, endTime, isNightShift
                }
            })
        })
            .then(() => {
                setIsLoading(false)
                fetchIds()
            })
            .catch((error) => console.error(error))
    }, 500)

    const handleChange = (event) => {
        const value = event.target.value;
        setSelectedOption(value);

        const selectedWork = workTime?.data?.find(work => work.name === value);
        const {startTime: startWorkTime, endTime: endWorkTime} = selectedWork;

        const selectedStartTime = startWorkTime === "00:00:00" ? null : startWorkTime
        const selectedEndTime = endWorkTime === "00:00:00" ? null : endWorkTime

        handleTimeChange(selectedStartTime, selectedEndTime, employee.id, employee.version);
    }

    return (
        <td colSpan={1} className="weekend-btn">
            {employee &&
                <div className="head-tab-time">
                    <div hidden>{employee?.startTime?.slice(0, -3)}</div>
                    {startTime && <DatePicker
                        disabled={disabled || isLoading || !userData?.editable}
                        selected={startTime}
                        showTimeSelect
                        showTimeSelectOnly
                        timeCaption="Время"
                        timeIntervals={10}
                        dateFormat="HH:mm"
                        timeFormat="HH:mm"
                        className="time pointer"
                        onChange={(time) => handleTimeChange(time, employee.endTime, employee.id, employee.version)}
                    />}
                    {startTime && endTime ? <div>-</div> : <div className="weekend">Выходной</div>}
                    <div hidden>{employee?.endTime?.slice(0, -3)}</div>
                    {endTime && <DatePicker
                        disabled={disabled || isLoading || !userData?.editable}
                        selected={endTime}
                        showTimeSelect
                        showTimeSelectOnly
                        timeCaption="Время"
                        timeIntervals={10}
                        dateFormat="HH:mm"
                        timeFormat="HH:mm"
                        className="time pointer"
                        onChange={(time) => handleTimeChange(employee?.startTime, time, employee.id, employee.version)}
                    />}
                    {(!disabled || userData?.editable) &&
                        <select className="custom-input" value={selectedOption} onChange={handleChange}>
                            {workTime?.data?.map((work) => (
                                <option key={work.name} value={work.name}>{work.name}</option>))}
                        </select>
                    }
                </div>
            }
        </td>
    );
};

export default Timepicker;