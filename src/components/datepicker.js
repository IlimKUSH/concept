import { useState } from 'react';
import DatePicker from "react-datepicker";


const Datepicker = ({employee, startTime, endTime, workTime, userData, handleTimeChange}) => {
    const [selectedOption, setSelectedOption] = useState(null);
    const [isLoading, setIsLoading] = useState(false); // Собственное состояние isLoading для компонента

    const handleChange = (event) => {
        const value = event.target.value;
        setSelectedOption(value);

        const selectedWork = workTime?.data?.find(work => work.name === value);
        const { startTime: startWorkTime, endTime: endWorkTime } = selectedWork;

        // const formattedStartTime = format(startTime, "hh:mm:ss")

        // const isWeekend = formattedStartTime === startWorkTime
        const startTimeToSend = startWorkTime === "00:00:00" ? null : startWorkTime
        const endTimeToSend = endWorkTime === "00:00:00" ? null : endWorkTime

        // if (isWeekend) {
        //     handleTimeChange(null, null, employee.id, employee.version);
        // } else {
        //     handleTimeChange(startTime, endTime, employee.id, employee.version);
        // }
        // if (selectedOption !== null) {
        handleTimeChange(startTimeToSend, endTimeToSend, employee.id, employee.version);
        // }
    }

    return (
        <>
            {!employee && <div style={{textAlign: "center"}}>Выходной</div>}
            {employee &&
                <div className="head-tab-time">
                    <div hidden>{employee?.startTime?.slice(0, -3)}</div>
                    {startTime && <DatePicker
                        disabled={isLoading || userData?.editable}
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
                    {startTime && endTime ? <div>-</div> : <div>Выходной</div>}
                    <div hidden>{employee?.endTime?.slice(0, -3)}</div>
                    {endTime && <DatePicker
                        disabled={isLoading || userData?.editable}
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
                    <select className="custom-select" value={selectedOption} onChange={handleChange}>
                        {workTime?.data?.map((work) => (
                            <option key={work.name} value={work.name}>{work.name}</option>
                        ))}
                    </select>
                </div>

            }
        </>
    );
};

export default Datepicker;