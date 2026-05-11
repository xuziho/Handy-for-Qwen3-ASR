pub fn normalize_chinese_numbers(input: &str) -> String {
    let chars: Vec<char> = input.chars().collect();
    let mut output = String::with_capacity(input.len());
    let mut index = 0;

    while index < chars.len() {
        if let Some((normalized, end)) = normalize_signed_at(&chars, index) {
            output.push_str(&normalized);
            index = end;
            continue;
        }

        if let Some((normalized, end)) = normalize_percentage_at(&chars, index) {
            output.push_str(&normalized);
            index = end;
            continue;
        }

        if let Some((normalized, end)) = normalize_number_at(&chars, index, false) {
            output.push_str(&normalized);
            index = end;
            continue;
        }

        output.push(chars[index]);
        index += 1;
    }

    output
}

fn normalize_signed_at(chars: &[char], start: usize) -> Option<(String, usize)> {
    if chars.get(start) == Some(&'负') {
        let (normalized, end) = normalize_number_at(chars, start + 1, true)?;
        return Some((format!("-{}", normalized), end));
    }

    if chars.get(start) == Some(&'零') && chars.get(start + 1) == Some(&'下') {
        let (normalized, end) = normalize_number_at(chars, start + 2, true)?;
        return Some((format!("-{}", normalized), end));
    }

    None
}

fn normalize_percentage_at(chars: &[char], start: usize) -> Option<(String, usize)> {
    if chars.get(start) != Some(&'百')
        || chars.get(start + 1) != Some(&'分')
        || chars.get(start + 2) != Some(&'之')
    {
        return None;
    }

    let (normalized, end) = normalize_number_at(chars, start + 3, true)?;
    Some((format!("{}%", normalized), end))
}

fn normalize_number_at(
    chars: &[char],
    start: usize,
    force_single_digit: bool,
) -> Option<(String, usize)> {
    if let Some(decimal) = normalize_decimal_at(chars, start) {
        return Some(decimal);
    }

    if !is_chinese_number_char(*chars.get(start)?) {
        return None;
    }

    let end = scan_number_end(chars, start);
    let raw: String = chars[start..end].iter().collect();
    let next = chars.get(end).copied();

    if !force_single_digit && should_keep_original(&raw, next) {
        return None;
    }

    if !force_single_digit
        && raw == "一"
        && next == Some('点')
        && chars
            .get(end + 1)
            .is_some_and(|ch| matches!(ch, '点' | '儿' | '些'))
    {
        return None;
    }

    if !force_single_digit && is_approximate_digit_pair(&raw, next) {
        return Some((raw, end));
    }

    normalize_number_token(&raw, next, force_single_digit).map(|value| (value, end))
}

fn normalize_decimal_at(chars: &[char], start: usize) -> Option<(String, usize)> {
    if !is_chinese_number_char(*chars.get(start)?) {
        return None;
    }

    let integer_end = scan_number_end(chars, start);
    if chars.get(integer_end) != Some(&'点') {
        return None;
    }

    let fraction_start = integer_end + 1;
    let mut fraction_end = fraction_start;
    while fraction_end < chars.len() && is_spoken_digit(chars[fraction_end]) {
        fraction_end += 1;
    }

    if fraction_end == fraction_start {
        return None;
    }

    if chars
        .get(fraction_end)
        .is_some_and(|ch| is_chinese_number_char(*ch))
    {
        return None;
    }

    let integer_raw: String = chars[start..integer_end].iter().collect();
    let integer_value = parse_chinese_number(&integer_raw)?;
    let fraction: String = chars[fraction_start..fraction_end]
        .iter()
        .filter_map(|ch| chinese_digit_value(*ch))
        .collect();

    Some((format!("{}.{}", integer_value, fraction), fraction_end))
}

fn scan_number_end(chars: &[char], start: usize) -> usize {
    let mut end = start;
    while end < chars.len() && is_chinese_number_char(chars[end]) {
        end += 1;
    }
    end
}

fn is_chinese_number_char(ch: char) -> bool {
    matches!(
        ch,
        '零' | '〇'
            | '洞'
            | '一'
            | '幺'
            | '二'
            | '两'
            | '三'
            | '四'
            | '五'
            | '六'
            | '七'
            | '八'
            | '九'
            | '十'
            | '百'
            | '千'
            | '万'
            | '亿'
    )
}

fn should_keep_original(raw: &str, next: Option<char>) -> bool {
    matches!((raw, next), ("一", Some('个')) | ("一", Some('下')))
}

fn is_approximate_digit_pair(raw: &str, next: Option<char>) -> bool {
    raw.chars().count() == 2
        && raw.chars().all(is_spoken_digit)
        && !raw
            .chars()
            .any(|ch| matches!(ch, '零' | '〇' | '洞' | '幺'))
        && is_approximate_measure_unit(next)
}

fn is_approximate_measure_unit(next: Option<char>) -> bool {
    matches!(
        next,
        Some(
            '天' | '周'
                | '年'
                | '月'
                | '个'
                | '次'
                | '条'
                | '件'
                | '块'
                | '元'
                | '岁'
                | '页'
                | '章'
                | '节'
        )
    )
}

fn normalize_number_token(
    raw: &str,
    next: Option<char>,
    force_single_digit: bool,
) -> Option<String> {
    if raw.chars().all(is_spoken_digit) {
        let len = raw.chars().count();
        if len >= 2 || force_single_digit || should_normalize_single_digit(next) {
            return Some(raw.chars().filter_map(chinese_digit_value).collect());
        }
        return None;
    }

    parse_chinese_number(raw).map(|value| value.to_string())
}

fn should_normalize_single_digit(next: Option<char>) -> bool {
    matches!(
        next,
        Some(
            '年' | '月'
                | '日'
                | '号'
                | '点'
                | '分'
                | '秒'
                | '到'
                | '至'
                | '天'
                | '周'
                | '楼'
                | '单'
                | '层'
                | '室'
                | '节'
                | '集'
                | '块'
                | '元'
                | '个'
                | '次'
                | '条'
                | '件'
                | '章'
                | '页'
                | '岁'
        )
    )
}

fn is_spoken_digit(ch: char) -> bool {
    chinese_digit_value(ch).is_some()
}

fn chinese_digit_value(ch: char) -> Option<char> {
    match ch {
        '零' | '〇' => Some('0'),
        '一' | '幺' => Some('1'),
        '二' | '两' => Some('2'),
        '三' => Some('3'),
        '四' => Some('4'),
        '五' => Some('5'),
        '六' => Some('6'),
        '七' => Some('7'),
        '八' => Some('8'),
        '九' => Some('9'),
        '洞' => Some('0'),
        _ => None,
    }
}

fn parse_chinese_number(raw: &str) -> Option<u64> {
    let mut total = 0_u64;
    let mut section = 0_u64;
    let mut digit: Option<u64> = None;
    let mut saw_any = false;

    for ch in raw.chars() {
        if let Some(value) = chinese_digit_numeric_value(ch) {
            digit = Some(value);
            saw_any = true;
            continue;
        }

        match ch {
            '十' | '百' | '千' => {
                let unit = small_unit_value(ch)?;
                section += digit.take().unwrap_or(1) * unit;
                saw_any = true;
            }
            '万' | '亿' => {
                let unit = large_unit_value(ch)?;
                section += digit.take().unwrap_or(0);
                total += section.max(1) * unit;
                section = 0;
                saw_any = true;
            }
            _ => return None,
        }
    }

    if !saw_any {
        return None;
    }

    Some(total + section + digit.unwrap_or(0))
}

fn chinese_digit_numeric_value(ch: char) -> Option<u64> {
    match ch {
        '零' | '〇' | '洞' => Some(0),
        '一' | '幺' => Some(1),
        '二' | '两' => Some(2),
        '三' => Some(3),
        '四' => Some(4),
        '五' => Some(5),
        '六' => Some(6),
        '七' => Some(7),
        '八' => Some(8),
        '九' => Some(9),
        _ => None,
    }
}

fn small_unit_value(ch: char) -> Option<u64> {
    match ch {
        '十' => Some(10),
        '百' => Some(100),
        '千' => Some(1_000),
        _ => None,
    }
}

fn large_unit_value(ch: char) -> Option<u64> {
    match ch {
        '万' => Some(10_000),
        '亿' => Some(100_000_000),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::normalize_chinese_numbers;

    #[test]
    fn normalizes_spoken_digit_sequences() {
        assert_eq!(
            normalize_chinese_numbers("我的手机号是一三八零零一二三四五六"),
            "我的手机号是13800123456"
        );
        assert_eq!(normalize_chinese_numbers("验证码六八零九"), "验证码6809");
        assert_eq!(normalize_chinese_numbers("房间号三洞二"), "房间号302");
        assert_eq!(normalize_chinese_numbers("编号幺二三"), "编号123");
    }

    #[test]
    fn normalizes_place_value_numbers() {
        assert_eq!(
            normalize_chinese_numbers("今天卖了一百二十三个，成本三千零五十块"),
            "今天卖了123个，成本3050块"
        );
        assert_eq!(
            normalize_chinese_numbers("十一点二十五分开会"),
            "11点25分开会"
        );
    }

    #[test]
    fn normalizes_decimal_numbers_without_breaking_time_phrases() {
        assert_eq!(normalize_chinese_numbers("比例是三点五"), "比例是3.5");
        assert_eq!(normalize_chinese_numbers("阈值零点八"), "阈值0.8");
        assert_eq!(
            normalize_chinese_numbers("金额一百二十三点四五元"),
            "金额123.45元"
        );
        assert_eq!(normalize_chinese_numbers("版本二点一零"), "版本2.10");
        assert_eq!(
            normalize_chinese_numbers("十一点二十五分开会"),
            "11点25分开会"
        );
    }

    #[test]
    fn normalizes_signed_numbers() {
        assert_eq!(normalize_chinese_numbers("温度负三点五度"), "温度-3.5度");
        assert_eq!(normalize_chinese_numbers("今天零下三度"), "今天-3度");
        assert_eq!(normalize_chinese_numbers("收益负二十块"), "收益-20块");
    }

    #[test]
    fn normalizes_years_and_percentages() {
        assert_eq!(
            normalize_chinese_numbers("二零二六年五月十一号"),
            "2026年5月11号"
        );
        assert_eq!(normalize_chinese_numbers("完成了百分之三十五"), "完成了35%");
        assert_eq!(normalize_chinese_numbers("下降百分之三点五"), "下降3.5%");
        assert_eq!(
            normalize_chinese_numbers("错误率百分之零点八"),
            "错误率0.8%"
        );
    }

    #[test]
    fn normalizes_ordinals_ranges_and_addresses() {
        assert_eq!(normalize_chinese_numbers("第十二章第二节"), "第12章第2节");
        assert_eq!(normalize_chinese_numbers("大概三到五天"), "大概3到5天");
        assert_eq!(
            normalize_chinese_numbers("一号楼二单元三零二室"),
            "1号楼2单元302室"
        );
    }

    #[test]
    fn keeps_common_non_numeric_phrases_readable() {
        assert_eq!(normalize_chinese_numbers("我有一个想法"), "我有一个想法");
        assert_eq!(normalize_chinese_numbers("等一下再说"), "等一下再说");
        assert_eq!(normalize_chinese_numbers("有一点点复杂"), "有一点点复杂");
        assert_eq!(normalize_chinese_numbers("等一点儿时间"), "等一点儿时间");
        assert_eq!(normalize_chinese_numbers("大概两三天"), "大概两三天");
        assert_eq!(normalize_chinese_numbers("三四个问题"), "三四个问题");
        assert_eq!(normalize_chinese_numbers("一两个选择"), "一两个选择");
    }
}
