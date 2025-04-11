function showError(errorMessage) {
    const boxWidth = errorMessage.length + 4; // Add 4 for padding
    const horizontalLine = "─".repeat(boxWidth);
    console.error(`\x1b[31m┌${horizontalLine}┐\x1b[0m`);
    console.error(`\x1b[31m│ ${errorMessage} │\x1b[0m`);
    console.error(`\x1b[31m└${horizontalLine}┘\x1b[0m`);
}

module.exports = showError;
