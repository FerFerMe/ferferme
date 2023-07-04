import { useCallback, useEffect, useState, memo } from 'react';
import { useDispatch } from 'react-redux';
import { updateUser } from '../../../redux/action-creators';
export const getDaysInMonth = (month) => {
  if ([1, 3, 5, 7, 8, 10, 12].includes(+month)) {
    return 31;
  }
  if ([4, 6, 9, 11].includes(+month)) {
    return 30;
  }
  return 29;
};
const months = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];
const getMonthNumber = (monthName) => {
  const month = months.find((m) => m.label.toLowerCase() === monthName.toLowerCase());
  return month ? month.value : null;
};
const MonthSelect = memo(({ birthday, selectedMonth, handleMonthChange }) => {
  const optionsValue = `${selectedMonth}`.padStart(2, '0') || '';
  return (
    <div className="datepicker-div">
      <select
        className="form-control datepicker-input"
        id="month-select"
        disabled={birthday}
        onChange={handleMonthChange}
        value={optionsValue}
      >
        <option value="">Select a month</option>
        {months.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>
    </div>
  );
});
const DaySelect = memo(({ birthday, selectedDay, daysInMonth, handleDayChange }) => {
  const optionsValue = selectedDay || '';
  return (
    <div className="datepicker-div">
      <select
        className="form-control datepicker-input"
        id="day-select"
        disabled={!daysInMonth || birthday}
        onChange={handleDayChange}
        value={optionsValue}
      >
        <option value="">Select a day</option>
        {Array(daysInMonth)
          .fill()
          .map((_, index) => (
            <option key={index + 1} value={index + 1}>
              {index + 1}
            </option>
          ))}
      </select>
    </div>
  );
});
const BDButton = memo(
  ({ description, buttonText, selectedMonth, selectedDay, dispatch, userId }) => {
    const btnBDHandler = useCallback(() => {
      let newDescription = description.slice(0, description.indexOf('🎂')).trim();
      if (buttonText === 'Add') {
        newDescription = `${description}\n🎂 Born ${
          months[+selectedMonth - 1].label
        } ${selectedDay}`;
      }
      dispatch(
        updateUser({
          id: userId,
          description: newDescription.trim(),
        }),
      );
    }, [description, buttonText, selectedMonth, selectedDay, dispatch, userId]);
    return (
      <div className="datepicker-div">
        <button
          className="btn btn-default"
          type="button"
          onClick={btnBDHandler}
          disabled={!selectedDay || !selectedMonth}
        >
          {buttonText}
        </button>
      </div>
    );
  },
);
const BirthdayPicker = ({ userId, description, birthday }) => {
  const dispatch = useDispatch();
  const [selectedMonth, setSelectedMonth] = useState(parseInt(birthday[1], 10) || null);
  const [selectedDay, setSelectedDay] = useState(parseInt(birthday[2], 10) || null);
  const [buttonText, setButtonText] = useState(birthday ? 'Remove' : 'Add');
  const daysInMonth = selectedMonth ? getDaysInMonth(selectedMonth) : null;
  useEffect(() => {
    if (birthday) {
      setSelectedMonth(getMonthNumber(birthday[1]));
      setSelectedDay(birthday[2]);
      setButtonText('Remove');
    } else {
      setButtonText('Add');
    }
  }, [selectedDay, selectedMonth, birthday]);
  const handleMonthChange = useCallback((event) => {
    setSelectedMonth(event.target.value);
    setSelectedDay(null);
  }, []);
  const handleDayChange = useCallback((event) => {
    setSelectedDay(event.target.value);
  }, []);
  return (
    <div>
      <MonthSelect
        birthday={birthday}
        selectedMonth={selectedMonth}
        handleMonthChange={handleMonthChange}
      />
      <DaySelect
        birthday={birthday}
        selectedDay={selectedDay}
        daysInMonth={daysInMonth}
        handleDayChange={handleDayChange}
      />
      <BDButton
        description={description}
        buttonText={buttonText}
        selectedMonth={selectedMonth}
        selectedDay={selectedDay}
        dispatch={dispatch}
        userId={userId}
      />
    </div>
  );
};
export default BirthdayPicker;
