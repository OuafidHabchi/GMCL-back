const TimeEntry = require('../models/TimeEntry');

// Créer une nouvelle entrée de temps
exports.createTimeEntry = async (req, res) => {
  try {
    const { employeeId, date, startTime } = req.body;
    
    const existingEntry = await TimeEntry.findOne({ 
      employeeId, 
      date,
      endTime: { $exists: false }
    });

    if (existingEntry) {
      return res.status(400).json({ 
        success: false,
        message: 'Une session est déjà en cours pour cet employé aujourd\'hui'
      });
    }

    const timeEntry = new TimeEntry({
      employeeId,
      date,
      startTime
    });

    await timeEntry.save();

    res.status(201).json({
      success: true,
      timeEntry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Mettre à jour une entrée de temps
exports.updateTimeEntry = async (req, res) => {
    try {
      const { id } = req.params;
      const { endTime, breakDuration, date } = req.body;

  
      const timeEntry = await TimeEntry.findOneAndUpdate(
        { employeeId: id, date }, // <-- Trouver par employeeId et date
        { endTime, breakDuration }, // <-- Mettre à jour
        { new: true } // <-- Retourner la version mise à jour
      );
  
      if (!timeEntry) {
        return res.status(404).json({
          success: false,
          message: 'Entrée de temps non trouvée'
        });
      }
  
      res.json({
        success: true,
        timeEntry
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };
  

// Obtenir les entrées de temps
exports.getTimeEntries = async (req, res) => {
  try {
    const { employeeId, date, startDate, endDate } = req.query;
    let query = {};

    if (employeeId) query.employeeId = employeeId;
    if (date) query.date = date;
    
    if (startDate && endDate) {
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const timeEntries = await TimeEntry.find(query)
      .sort({ date: 1, startTime: 1 })
      .populate('employeeId', 'name email');

    res.json({
      success: true,
      timeEntries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Générer un rapport
exports.generateReport = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    

    const timeEntries = await TimeEntry.find({
      employeeId,
      date: { $gte: startDate, $lte: endDate },
      endTime: { $exists: true }
    }).populate('employeeId', 'name');

    if (timeEntries.length === 0) {
      return res.json({
        success: true,
        report: null,
        message: 'Aucune donnée trouvée pour cette période'
      });
    }

    // Calcul des données du rapport
    const dailyData = timeEntries.map(entry => {
      const start = new Date(`${entry.date}T${entry.startTime}`);
      const end = new Date(`${entry.date}T${entry.endTime}`);
      const hoursWorked = (end - start) / (1000 * 60 * 60) ;
      
      return {
        date: entry.date,
        startTime: entry.startTime,
        endTime: entry.endTime,
        breakDuration: entry.breakDuration,
        hoursWorked: parseFloat(hoursWorked.toFixed(2))
      };
    });

    const totalHours = dailyData.reduce((sum, day) => sum + day.hoursWorked, 0);
    const totalBreak = dailyData.reduce((sum, day) => sum + day.breakDuration, 0);

    res.json({
      success: true,
      report: {
        employeeName: timeEntries[0].employeeId.name,
        dateRange: { start: startDate, end: endDate },
        dailyData,
        totalHours: parseFloat(totalHours.toFixed(2)),
        totalBreak
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};