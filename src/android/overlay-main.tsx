import { createRoot } from "react-dom/client";
import { Frontier } from "../frontier/Frontier";
import "../styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("FRONTIER overlay root element is missing.");

document.documentElement.classList.add("frontier-android-overlay");
createRoot(root).render(<Frontier presentation="android-overlay" />);
