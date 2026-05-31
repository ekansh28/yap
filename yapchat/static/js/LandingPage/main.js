console.log("MAIN JS LOADED");
import {initTagInput} from "./features/tagInput.js";
import Notification from '../Components/Notification/Notification.js';

window.Notification = Notification;
initTagInput();