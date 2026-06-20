console.log("MAIN JS LOADED");
import {initTagInput} from "./features/tagInput.js";
import Notification from '../Components/Notification/Notification.js?v=2';

window.Notification = Notification;
initTagInput();