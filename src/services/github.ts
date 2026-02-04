export function handleMergeConflict(conflicts: any[]) {
  if (conflicts.length === 0) {
    return 'No conflicts detected.';
  }

  return conflicts.map(conflict => {
    return `Conflict: ${conflict.title}\nFile: ${conflict.filePath}\n${conflict.conflictingSections.map(section => `Lines ${section.start} to ${section.end}`).join('\n')}\n`;
  }).join('\n');
}
