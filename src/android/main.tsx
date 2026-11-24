import { createRoot } from "react-dom/client";
import { FrontierEntry } from "../frontier/FrontierEntry";
import "../styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("FRONTIER Android root element is missing.");

document.documentElement.classList.add("frontier-android-app");
createRoot(root).render(<FrontierEntry />);
