export const getStartOfDayUTC = () => {
    const now = new Date();
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
};

export const calculateHours = (start, end) => {
    if (!start || !end) throw new Error('Missing time values');
    const diff = end.getTime() - start.getTime();
    if (diff < 0) throw new Error('Negative time difference');
    return parseFloat((diff / 3600000).toFixed(2));
};