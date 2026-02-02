/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Community from './pages/Community';
import Directory from './pages/Directory';
import MyCard from './pages/MyCard';
import Profile from './pages/Profile';
import Register from './pages/Register';
import Welcome from './pages/Welcome';
import Recommendations from './pages/Recommendations';
import LandlordLogin from './pages/LandlordLogin';
import LandlordDashboard from './pages/LandlordDashboard';


export const PAGES = {
    "Community": Community,
    "Directory": Directory,
    "MyCard": MyCard,
    "Profile": Profile,
    "Register": Register,
    "Welcome": Welcome,
    "Recommendations": Recommendations,
    "LandlordLogin": LandlordLogin,
    "LandlordDashboard": LandlordDashboard,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
};