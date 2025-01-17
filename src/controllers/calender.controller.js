const { getCalendarService } = require('../services/calender.service');

exports.getAvailability = async (req, res) => {
    console.log("hi");
    try {
      const { startDate, endDate } = req.query;
      const service = await getCalendarService(req.user);
  
      // Get busy intervals from primary calendar
      const freeBusy = await service.freebusy.query({
        requestBody: {
          timeMin: new Date(startDate).toISOString(),
          timeMax: new Date(endDate).toISOString(),
          items: [{ id: 'primary' }],
        },
      });
  
      const busySlots = freeBusy.data.calendars.primary.busy;
  
      // Create available time slots (9 AM to 5 PM)
      const availableSlots = [];
      let currentDate = new Date(startDate);
      const endDateTime = new Date(endDate);
  
      while (currentDate < endDateTime) {
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) { // Skip weekends
          const dayStart = new Date(currentDate);
          dayStart.setHours(9, 0, 0, 0);
          const dayEnd = new Date(currentDate);
          dayEnd.setHours(17, 0, 0, 0);
  
          // Sort busy slots for the current day
          const dayBusySlots = busySlots.filter(busy => {
            const busyStart = new Date(busy.start);
            const busyEnd = new Date(busy.end);
            return busyStart.toDateString() === currentDate.toDateString();
          }).sort((a, b) => new Date(a.start) - new Date(b.start));
  
          // Find available time slots between busy periods
          let slotStart = dayStart;
          for (const busy of dayBusySlots) {
            const busyStart = new Date(busy.start);
            if (slotStart < busyStart) {
              availableSlots.push({
                start: slotStart.toISOString(),
                end: busyStart.toISOString(),
              });
            }
            slotStart = new Date(Math.max(slotStart, new Date(busy.end)));
          }
  
          // Add the remaining free time after the last busy slot
          if (slotStart < dayEnd) {
            availableSlots.push({
              start: slotStart.toISOString(),
              end: dayEnd.toISOString(),
            });
          }
        }
  
        currentDate.setDate(currentDate.getDate() + 1);
      }
  
      res.json({ availableSlots });
    } catch (error) {
      console.error('Get availability error:', error);
      res.status(500).json({ error: 'Failed to get availability' });
    }
  };
  
