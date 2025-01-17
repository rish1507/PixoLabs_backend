const { getCalendarService } = require('../services/calender.service');

exports.getAvailability = async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const service = await getCalendarService(req.user);
  
      // Create dates with explicit US timezone (EST)
      const options = { timeZone: 'America/New_York' };
      const usStartDate = new Date(new Date(startDate).toLocaleString('en-US', options));
      const usEndDate = new Date(new Date(endDate).toLocaleString('en-US', options));
  
      // Get busy intervals from primary calendar
      const freeBusy = await service.freebusy.query({
        requestBody: {
          timeMin: usStartDate.toISOString(),
          timeMax: usEndDate.toISOString(),
          items: [{ id: 'primary' }],
        },
      });
  
      const busySlots = freeBusy.data.calendars.primary.busy;
      const availableSlots = [];
      let currentDate = new Date(usStartDate);
      const endDateTime = new Date(usEndDate);
  
      while (currentDate < endDateTime) {
        const dayStart = new Date(currentDate.toLocaleString('en-US', options));
        dayStart.setHours(6, 0, 0, 0);
        const dayEnd = new Date(currentDate.toLocaleString('en-US', options));
        dayEnd.setHours(23, 0, 0, 0);
  
        // Sort busy slots for the current day
        const dayBusySlots = busySlots
          .filter(busy => {
            const busyStart = new Date(new Date(busy.start).toLocaleString('en-US', options));
            const busyEnd = new Date(new Date(busy.end).toLocaleString('en-US', options));
            return busyStart.toDateString() === currentDate.toDateString();
          })
          .sort((a, b) => new Date(a.start) - new Date(b.start));
  
        // Find available time slots between busy periods
        let slotStart = dayStart;
        for (const busy of dayBusySlots) {
          const busyStart = new Date(new Date(busy.start).toLocaleString('en-US', options));
          if (slotStart < busyStart) {
            availableSlots.push({
              start: new Date(slotStart).toISOString(),
              end: new Date(busyStart).toISOString(),
            });
          }
          slotStart = new Date(Math.max(slotStart, new Date(new Date(busy.end).toLocaleString('en-US', options))));
        }
  
        // Add the remaining free time after the last busy slot
        if (slotStart < dayEnd) {
          availableSlots.push({
            start: new Date(slotStart).toISOString(),
            end: new Date(dayEnd).toISOString(),
          });
        }
  
        currentDate.setDate(currentDate.getDate() + 1);
      }
  
      res.json({ availableSlots });
    } catch (error) {
      console.error('Get availability error:', error);
      res.status(500).json({ error: 'Failed to get availability' });
    }
  };