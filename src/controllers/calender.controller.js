const { getCalendarService } = require('../services/calender.service');
const { IANAZone, DateTime, Interval } = require('luxon');

exports.getAvailability = async (req, res) => {
  try {
    const { startDate, endDate, timeZone = 'UTC' } = req.query;

    // Validate the time zone
    if (!IANAZone.isValidZone(timeZone)) {
      return res.status(400).json({
        error: 'Invalid time zone. Please provide a valid IANA time zone identifier.',
      });
    }

    const service = await getCalendarService(req.user);

    // Parse startDate and endDate in the specified time zone
    const startDateTime = DateTime.fromISO(startDate, { zone: timeZone }).startOf('day');
    const endDateTime = DateTime.fromISO(endDate, { zone: timeZone }).endOf('day');

    if (!startDateTime.isValid || !endDateTime.isValid) {
      return res.status(400).json({
        error: 'Invalid date format. Please provide dates in ISO 8601 format.',
      });
    }

    if (endDateTime < startDateTime) {
      return res.status(400).json({
        error: 'End date must be after start date.',
      });
    }

    // Get busy intervals from the calendar
    const freeBusy = await service.freebusy.query({
      requestBody: {
        timeMin: startDateTime.toUTC().toISO(),
        timeMax: endDateTime.toUTC().toISO(),
        timeZone: timeZone,
        items: [{ id: 'primary' }],
      },
    });

    const busySlots = freeBusy.data.calendars.primary.busy.map((busy) => ({
      start: DateTime.fromISO(busy.start, { zone: timeZone }),
      end: DateTime.fromISO(busy.end, { zone: timeZone }),
    }));

    const availableSlots = [];

    // Process each day in the specified time zone
    let currentDate = startDateTime;
    while (currentDate <= endDateTime) {
      const dayStart = currentDate.set({ hour: 6, minute: 0 });
      const dayEnd = currentDate.set({ hour: 23, minute: 0 });

      // Filter busy intervals that overlap with the current day
      const dayBusyIntervals = busySlots
        .filter((interval) =>
          Interval.fromDateTimes(interval.start, interval.end).overlaps(
            Interval.fromDateTimes(dayStart, dayEnd)
          )
        )
        .sort((a, b) => a.start - b.start);

      // Find available slots
      let slotStart = dayStart;

      for (const busyInterval of dayBusyIntervals) {
        if (slotStart < busyInterval.start) {
          availableSlots.push({
            start: slotStart.toISO(),
            end: busyInterval.start.toISO(),
            timeZone: timeZone,
          });
        }
        slotStart = busyInterval.end > slotStart ? busyInterval.end : slotStart;
      }

      // Add remaining time until dayEnd if available
      if (slotStart < dayEnd) {
        availableSlots.push({
          start: slotStart.toISO(),
          end: dayEnd.toISO(),
          timeZone: timeZone,
        });
      }

      // Move to the next day
      currentDate = currentDate.plus({ days: 1 });
    }

    res.json({
      availableSlots,
      metadata: {
        startDate: startDateTime.toISO(),
        endDate: endDateTime.toISO(),
        timeZone,
      },
    });
  } catch (error) {
    console.error('Error in getAvailability:', error);

    res.status(500).json({
      error: 'Failed to get availability',
      message: error.message,
    });
  }
};
