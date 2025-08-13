// server/controllers/portfolioController.js
import Portfolio from '../models/Portfolio.js';
import Doctor from '../models/Doctor.js';

export const getPortfolios = async (req, res) => {
  try {
    const { page = 1, limit = 100, search = '' } = req.query;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    
    const portfolios = await Portfolio.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Portfolio.countDocuments(query);
    
    res.json({
      portfolios,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get portfolios error:', error);
    res.status(500).json({ message: 'Failed to fetch portfolios' });
  }
};

export const getPortfolio = async (req, res) => {
  try {
    const { id } = req.params;
    
    const portfolio = await Portfolio.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    res.json(portfolio);
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ message: 'Failed to fetch portfolio' });
  }
};

export const createPortfolio = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Check if portfolio already exists
    const existingPortfolio = await Portfolio.findOne({ name });
    if (existingPortfolio) {
      return res.status(400).json({ message: 'Portfolio with this name already exists' });
    }
    
    const portfolio = new Portfolio({
      name,
      description,
      createdBy: req.user._id,
    });
    
    await portfolio.save();
    await portfolio.populate('createdBy', 'name email');
    
    res.status(201).json({
      message: 'Portfolio created successfully',
      portfolio,
    });
  } catch (error) {
    console.error('Create portfolio error:', error);
    res.status(500).json({ message: 'Failed to create portfolio' });
  }
};

export const updatePortfolio = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;
    
    const portfolio = await Portfolio.findById(id);
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    // Check if name already exists (excluding current portfolio)
    if (name !== portfolio.name) {
      const existingPortfolio = await Portfolio.findOne({ name, _id: { $ne: id } });
      if (existingPortfolio) {
        return res.status(400).json({ message: 'Portfolio with this name already exists' });
      }
    }
    
    // Update fields
    portfolio.name = name;
    portfolio.description = description;
    portfolio.isActive = isActive;
    portfolio.updatedBy = req.user._id;
    
    await portfolio.save();
    await portfolio.populate('createdBy', 'name email');
    await portfolio.populate('updatedBy', 'name email');
    
    res.json({
      message: 'Portfolio updated successfully',
      portfolio,
    });
  } catch (error) {
    console.error('Update portfolio error:', error);
    res.status(500).json({ message: 'Failed to update portfolio' });
  }
};

export const deletePortfolio = async (req, res) => {
  try {
    const { id } = req.params;
    
    const portfolio = await Portfolio.findById(id);
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    // Check if portfolio is being used by any doctors
    const doctorsWithPortfolio = await Doctor.countDocuments({ specialization: id });
    if (doctorsWithPortfolio > 0) {
      return res.status(400).json({ 
        message: `Cannot delete portfolio. It is currently assigned to ${doctorsWithPortfolio} doctor(s)` 
      });
    }
    
    await Portfolio.findByIdAndDelete(id);
    
    res.json({ message: 'Portfolio deleted successfully' });
  } catch (error) {
    console.error('Delete portfolio error:', error);
    res.status(500).json({ message: 'Failed to delete portfolio' });
  }
};

export const getPortfolioStats = async (req, res) => {
  try {
    // Get total portfolios
    const totalPortfolios = await Portfolio.countDocuments();
    const activePortfolios = await Portfolio.countDocuments({ isActive: true });
    
    // Get most used portfolios
    const mostUsedPortfolios = await Doctor.aggregate([
      { $unwind: '$specialization' },
      {
        $group: {
          _id: '$specialization',
          doctorCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'portfolios',
          localField: '_id',
          foreignField: '_id',
          as: 'portfolio'
        }
      },
      {
        $unwind: '$portfolio'
      },
      {
        $sort: { doctorCount: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          _id: 1,
          doctorCount: 1,
          name: '$portfolio.name',
          description: '$portfolio.description'
        }
      }
    ]);
    
    res.json({
      totalPortfolios,
      activePortfolios,
      inactivePortfolios: totalPortfolios - activePortfolios,
      mostUsedPortfolios,
    });
  } catch (error) {
    console.error('Get portfolio stats error:', error);
    res.status(500).json({ message: 'Failed to fetch portfolio statistics' });
  }
};