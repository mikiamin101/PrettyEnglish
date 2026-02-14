/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a, b) {
  const matrix = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Normalize Hebrew text for comparison
 * Removes niqqud, extra spaces, and normalizes final letters
 */
function normalizeHebrew(text) {
  return text
    // Remove niqqud (vowel marks U+0591–U+05C7)
    .replace(/[\u0591-\u05C7]/g, '')
    // Trim and collapse whitespace
    .trim()
    .replace(/\s+/g, ' ')
    // Lowercase any mixed-in English
    .toLowerCase()
    // Normalize final-form letters to regular forms
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ')
}

/**
 * Check if user's answer matches any accepted translation.
 * Uses fuzzy matching with Levenshtein distance for leniency.
 */
export function checkTranslation(userAnswer, validTranslations) {
  const normalizedAnswer = normalizeHebrew(userAnswer)

  for (const translation of validTranslations) {
    const normalizedTranslation = normalizeHebrew(translation)

    // Exact match after normalization
    if (normalizedAnswer === normalizedTranslation) {
      return true
    }

    // Fuzzy match — allow errors based on word length
    const maxLen = Math.max(normalizedAnswer.length, normalizedTranslation.length)
    const distance = levenshteinDistance(normalizedAnswer, normalizedTranslation)

    // Short words (≤3 chars): allow 1 error, longer: allow 2
    const threshold = maxLen <= 3 ? 1 : 2

    if (distance <= threshold) {
      return true
    }
  }

  return false
}
