import { createRoot } from "react-dom/client";
import { FrontierEntry } from "../frontier/FrontierEntry";
import "../styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("FRONTIER overlay root element is missing.");

document.documentElement.classList.add("frontier-android-overlay");
createRoot(root).render(<FrontierEntry androidOverlay />);
