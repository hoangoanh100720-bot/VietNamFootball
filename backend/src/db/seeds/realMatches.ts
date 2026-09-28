/**
 * ============================================================================
 * DB/SEEDS/REALMATCHES.TS — TRẬN ĐẤU THẬT CỦA ĐỘI TUYỂN VIỆT NAM
 * ============================================================================
 *
 * ⚠️ FILE SINH TỰ ĐỘNG từ dữ liệu đã đối chiếu. Sửa tay được, nhưng mọi con số
 *    đều có nguồn — đừng "làm tròn" hay đoán thêm.
 *
 * 📚 NGUỒN
 *   • Trận, tỷ số, sân, giờ, khán giả, người ghi bàn: en.wikipedia
 *     "Vietnam national football team results (2020–present)", mỗi trận dẫn
 *     link biên bản (AFF, AFC, FIFA, Soccerway).
 *   • Giờ trận Thái Lan – Việt Nam 29/09/2026: hai trang Wikipedia lệch nhau
 *     (19:30 / 20:00) -> chốt 19:30 theo VOH, Thể thao & Văn hoá.
 *   • Đội hình 8 trận ASEAN Cup 2026: bảng đội hình trên các trang "2026 ASEAN
 *     Championship Group A / knockout stage / final" (trích biên bản AFF).
 *   • Bảng xếp hạng bảng đấu: các template "group tables" trên Wikipedia.
 *   • Xếp hạng FIFA: Module:SportsRankings/data/FIFA World Rankings, bản 2026-07-20.
 *
 * ❓ CỐ Ý KHÔNG CÓ (không có nguồn mở — thà trống còn hơn bịa):
 *   • Điểm đánh giá cầu thủ, kiến tạo, thông số trận (kiểm soát bóng, cú sút…).
 *   • Giờ đá các trận Asian Cup 2027 và giao hữu với Qatar: chưa công bố
 *     -> kickoff_time_tbd = true, app hiện "chưa có giờ".
 *   • Hai trận giao hữu tháng 11/2026 (Đài Bắc Trung Hoa, Kyrgyzstan): chưa có ngày.
 * ============================================================================
 */

export interface RealGoal {
  minute: number;
  extra?: number;
  /** Tên cầu thủ. Cầu thủ Việt Nam ghi đúng full_name trong DB để khớp player_id. */
  player: string;
  /** Đội của NGƯỜI GHI (với phản lưới nhà là đội của người đá phản lưới) */
  team: string;
  type: 'goal' | 'penalty' | 'own_goal';
}

export interface RealLineupPlayer {
  name: string;
  shirt: number;
  /** Vị trí theo biên bản: GK, CB, LM, CM, CF… */
  pos: string;
  starting: boolean;
  minutes: number;
  captain?: boolean;
  off?: number;
  on?: number;
  yellow?: number[];
  red?: number[];
}

export interface RealMatch {
  /** Khoá ổn định: ngày-chủ nhà-đội khách */
  key: string;
  competition: string;
  round: string;
  home: string;
  away: string;
  kickoff_at: string;
  kickoff_time_tbd?: boolean;
  venue: string | null;
  city: string | null;
  status: 'finished' | 'scheduled';
  home_score?: number;
  away_score?: number;
  attendance?: number;
  is_final?: boolean;
  note?: string;
  goals?: RealGoal[];
  lineup?: RealLineupPlayer[];
}

export const REAL_TEAMS: Array<{ fifa_code: string; name: string; logo_url: string }> = [
  {
    fifa_code: "VIE",
    name: "Việt Nam",
    logo_url: "https://flagcdn.com/w160/vn.png"
  },
  {
    fifa_code: "THA",
    name: "Thái Lan",
    logo_url: "https://flagcdn.com/w160/th.png"
  },
  {
    fifa_code: "IDN",
    name: "Indonesia",
    logo_url: "https://flagcdn.com/w160/id.png"
  },
  {
    fifa_code: "MAS",
    name: "Malaysia",
    logo_url: "https://flagcdn.com/w160/my.png"
  },
  {
    fifa_code: "SGP",
    name: "Singapore",
    logo_url: "https://flagcdn.com/w160/sg.png"
  },
  {
    fifa_code: "PHI",
    name: "Philippines",
    logo_url: "https://flagcdn.com/w160/ph.png"
  },
  {
    fifa_code: "LAO",
    name: "Lào",
    logo_url: "https://flagcdn.com/w160/la.png"
  },
  {
    fifa_code: "NEP",
    name: "Nepal",
    logo_url: "https://flagcdn.com/w160/np.png"
  },
  {
    fifa_code: "JPN",
    name: "Nhật Bản",
    logo_url: "https://flagcdn.com/w160/jp.png"
  },
  {
    fifa_code: "KOR",
    name: "Hàn Quốc",
    logo_url: "https://flagcdn.com/w160/kr.png"
  },
  {
    fifa_code: "CAM",
    name: "Campuchia",
    logo_url: "https://flagcdn.com/w160/kh.png"
  },
  {
    fifa_code: "MYA",
    name: "Myanmar",
    logo_url: "https://flagcdn.com/w160/mm.png"
  },
  {
    fifa_code: "TLS",
    name: "Đông Timor",
    logo_url: "https://flagcdn.com/w160/tl.png"
  },
  {
    fifa_code: "BAN",
    name: "Bangladesh",
    logo_url: "https://flagcdn.com/w160/bd.png"
  },
  {
    fifa_code: "PAK",
    name: "Pakistan",
    logo_url: "https://flagcdn.com/w160/pk.png"
  },
  {
    fifa_code: "QAT",
    name: "Qatar",
    logo_url: "https://flagcdn.com/w160/qa.png"
  },
  {
    fifa_code: "UAE",
    name: "UAE",
    logo_url: "https://flagcdn.com/w160/ae.png"
  },
  {
    fifa_code: "YEM",
    name: "Yemen",
    logo_url: "https://flagcdn.com/w160/ye.png"
  }
];

export const REAL_MATCHES: RealMatch[] = [
  {
    key: "2025-01-02-VIE-THA",
    competition: "ASEAN Cup 2024",
    round: "Chung kết - Lượt đi",
    home: "VIE",
    away: "THA",
    kickoff_at: "2025-01-02T13:00:00Z",
    venue: "SVĐ Việt Trì",
    city: "Phú Thọ",
    status: "finished",
    home_score: 2,
    away_score: 1,
    attendance: 15604,
    goals: [
      {
        minute: 59,
        player: "Nguyễn Xuân Son",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 73,
        player: "Nguyễn Xuân Son",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 83,
        player: "Chalermsak Aukkee",
        team: "THA",
        type: "goal"
      }
    ]
  },
  {
    key: "2025-01-05-THA-VIE",
    competition: "ASEAN Cup 2024",
    round: "Chung kết - Lượt về",
    home: "THA",
    away: "VIE",
    kickoff_at: "2025-01-05T13:00:00Z",
    venue: "SVĐ Rajamangala",
    city: "Bangkok",
    status: "finished",
    home_score: 2,
    away_score: 3,
    attendance: 46982,
    is_final: true,
    note: "Việt Nam vô địch ASEAN Cup 2024 với tổng tỷ số 5-3.",
    goals: [
      {
        minute: 8,
        player: "Phạm Tuấn Hải",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 28,
        player: "Ben Davis",
        team: "THA",
        type: "goal"
      },
      {
        minute: 64,
        player: "Supachok Sarachat",
        team: "THA",
        type: "goal"
      },
      {
        minute: 82,
        player: "Pansa Hemviboon",
        team: "THA",
        type: "own_goal"
      },
      {
        minute: 90,
        extra: 20,
        player: "Nguyễn Hai Long",
        team: "VIE",
        type: "goal"
      }
    ]
  },
  {
    key: "2025-03-19-VIE-CAM",
    competition: "Giao hữu quốc tế",
    round: "Giao hữu",
    home: "VIE",
    away: "CAM",
    kickoff_at: "2025-03-19T12:30:00Z",
    venue: "SVĐ Gò Đậu",
    city: "Bình Dương",
    status: "finished",
    home_score: 2,
    away_score: 1,
    goals: [
      {
        minute: 26,
        player: "Nguyễn Hai Long",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 35,
        player: "Nguyễn Văn Vĩ",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 64,
        player: "Bong Samuel",
        team: "CAM",
        type: "goal"
      }
    ]
  },
  {
    key: "2025-03-25-VIE-LAO",
    competition: "Vòng loại Asian Cup 2027",
    round: "Bảng F - Lượt 1",
    home: "VIE",
    away: "LAO",
    kickoff_at: "2025-03-25T12:30:00Z",
    venue: "SVĐ Gò Đậu",
    city: "Bình Dương",
    status: "finished",
    home_score: 5,
    away_score: 0,
    attendance: 11068,
    goals: [
      {
        minute: 11,
        player: "Châu Ngọc Quang",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 44,
        player: "Nguyễn Văn Vĩ",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 50,
        player: "Nguyễn Văn Vĩ",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 63,
        player: "Nguyễn Hai Long",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 84,
        player: "Nguyễn Quang Hải",
        team: "VIE",
        type: "goal"
      }
    ]
  },
  {
    key: "2025-06-10-MAS-VIE",
    competition: "Vòng loại Asian Cup 2027",
    round: "Bảng F - Lượt 2",
    home: "MAS",
    away: "VIE",
    kickoff_at: "2025-06-10T13:00:00Z",
    venue: "SVĐ Quốc gia Bukit Jalil",
    city: "Kuala Lumpur",
    status: "finished",
    home_score: 0,
    away_score: 3,
    attendance: 61512,
    note: "Tỷ số chính thức 0-3: ngày 17/03/2026 AFC xử Malaysia thua vì dùng 7 cầu thủ nhập tịch có giấy tờ giả mạo. Trên sân, Malaysia thắng 4-0."
  },
  {
    key: "2025-10-09-VIE-NEP",
    competition: "Vòng loại Asian Cup 2027",
    round: "Bảng F - Lượt 3",
    home: "VIE",
    away: "NEP",
    kickoff_at: "2025-10-09T12:30:00Z",
    venue: "SVĐ Gò Đậu",
    city: "TP. Hồ Chí Minh",
    status: "finished",
    home_score: 3,
    away_score: 1,
    attendance: 8597,
    goals: [
      {
        minute: 9,
        player: "Nguyễn Tiến Linh",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 17,
        player: "Sanish Shrestha",
        team: "NEP",
        type: "goal"
      },
      {
        minute: 67,
        player: "Phạm Xuân Mạnh",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 72,
        player: "Nguyễn Văn Vĩ",
        team: "VIE",
        type: "goal"
      }
    ]
  },
  {
    key: "2025-10-14-NEP-VIE",
    competition: "Vòng loại Asian Cup 2027",
    round: "Bảng F - Lượt 4",
    home: "NEP",
    away: "VIE",
    kickoff_at: "2025-10-14T12:30:00Z",
    venue: "SVĐ Thống Nhất",
    city: "TP. Hồ Chí Minh",
    status: "finished",
    home_score: 0,
    away_score: 1,
    attendance: 6870,
    note: "Nepal là đội chủ nhà nhưng đá tại SVĐ Thống Nhất vì sân ở Nepal không đạt chuẩn AFC.",
    goals: [
      {
        minute: 5,
        player: "Suman Shrestha",
        team: "NEP",
        type: "own_goal"
      }
    ]
  },
  {
    key: "2025-11-19-LAO-VIE",
    competition: "Vòng loại Asian Cup 2027",
    round: "Bảng F - Lượt 5",
    home: "LAO",
    away: "VIE",
    kickoff_at: "2025-11-19T12:00:00Z",
    venue: "SVĐ Quốc gia Lào mới",
    city: "Viêng Chăn",
    status: "finished",
    home_score: 0,
    away_score: 2,
    attendance: 16250,
    note: "Dời từ 18/11 sang 19/11/2025 vì lý do tổ chức của chủ nhà.",
    goals: [
      {
        minute: 67,
        player: "Nguyễn Xuân Son",
        team: "VIE",
        type: "penalty"
      },
      {
        minute: 90,
        extra: 2,
        player: "Phạm Tuấn Hải",
        team: "VIE",
        type: "goal"
      }
    ]
  },
  {
    key: "2026-03-26-VIE-BAN",
    competition: "Giao hữu quốc tế",
    round: "Giao hữu",
    home: "VIE",
    away: "BAN",
    kickoff_at: "2026-03-26T12:00:00Z",
    venue: "SVĐ Hàng Đẫy",
    city: "Hà Nội",
    status: "finished",
    home_score: 3,
    away_score: 0,
    goals: [
      {
        minute: 8,
        player: "Phạm Tuấn Hải",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 18,
        player: "Phạm Xuân Mạnh",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 38,
        player: "Nguyễn Hai Long",
        team: "VIE",
        type: "goal"
      }
    ]
  },
  {
    key: "2026-03-31-VIE-MAS",
    competition: "Vòng loại Asian Cup 2027",
    round: "Bảng F - Lượt 6",
    home: "VIE",
    away: "MAS",
    kickoff_at: "2026-03-31T12:00:00Z",
    venue: "SVĐ Thiên Trường",
    city: "Ninh Bình",
    status: "finished",
    home_score: 3,
    away_score: 1,
    attendance: 19518,
    note: "Việt Nam toàn thắng 6 trận, đứng đầu bảng F và giành vé dự VCK Asian Cup 2027.",
    goals: [
      {
        minute: 6,
        player: "Đỗ Duy Mạnh",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 51,
        player: "Nguyễn Xuân Son",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 59,
        player: "Nguyễn Xuân Son",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 77,
        player: "Endrick",
        team: "MAS",
        type: "penalty"
      }
    ]
  },
  {
    key: "2026-07-18-VIE-MYA",
    competition: "Giao hữu quốc tế",
    round: "Giao hữu",
    home: "VIE",
    away: "MYA",
    kickoff_at: "2026-07-18T12:00:00Z",
    venue: "SVĐ Thái Nguyên",
    city: "Thái Nguyên",
    status: "finished",
    home_score: 4,
    away_score: 0,
    goals: [
      {
        minute: 5,
        player: "Nguyễn Xuân Son",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 39,
        player: "Phạm Xuân Mạnh",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 59,
        player: "Đỗ Hoàng Hên",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 90,
        extra: 1,
        player: "Nguyễn Đình Bắc",
        team: "VIE",
        type: "penalty"
      }
    ]
  },
  {
    key: "2026-07-24-TLS-VIE",
    competition: "ASEAN Cup 2026",
    round: "Bảng A",
    home: "TLS",
    away: "VIE",
    kickoff_at: "2026-07-24T13:30:00Z",
    venue: "SVĐ Chonburi",
    city: "Chonburi (Thái Lan)",
    status: "finished",
    home_score: 0,
    away_score: 7,
    attendance: 195,
    note: "Đông Timor là đội chủ nhà nhưng đá tại Thái Lan.",
    goals: [
      {
        minute: 7,
        player: "Đỗ Hoàng Hên",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 31,
        player: "Nguyễn Đình Bắc",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 41,
        player: "Đỗ Hoàng Hên",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 42,
        player: "Nguyễn Đình Bắc",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 45,
        extra: 1,
        player: "Nguyễn Xuân Son",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 65,
        player: "Nguyễn Đình Bắc",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 79,
        player: "Nguyễn Quang Hải",
        team: "VIE",
        type: "goal"
      }
    ],
    lineup: [
      {
        name: "Lê Giang Patrik",
        shirt: 1,
        pos: "GK",
        starting: true,
        minutes: 90
      },
      {
        name: "Phạm Xuân Mạnh",
        shirt: 7,
        pos: "CB",
        starting: true,
        minutes: 76,
        off: 76
      },
      {
        name: "Nguyễn Thành Chung",
        shirt: 16,
        pos: "CB",
        starting: true,
        minutes: 63,
        off: 63
      },
      {
        name: "Đoàn Văn Hậu",
        shirt: 5,
        pos: "CB",
        starting: true,
        minutes: 90
      },
      {
        name: "Trương Tiến Anh",
        shirt: 15,
        pos: "RM",
        starting: true,
        minutes: 63,
        off: 63
      },
      {
        name: "Nguyễn Quang Hải",
        shirt: 19,
        pos: "CM",
        starting: true,
        minutes: 90,
        captain: true
      },
      {
        name: "Nguyễn Hoàng Đức",
        shirt: 14,
        pos: "CM",
        starting: true,
        minutes: 90
      },
      {
        name: "Nguyễn Văn Vĩ",
        shirt: 3,
        pos: "LM",
        starting: true,
        minutes: 63,
        off: 63
      },
      {
        name: "Đỗ Hoàng Hên",
        shirt: 10,
        pos: "RF",
        starting: true,
        minutes: 86,
        off: 86
      },
      {
        name: "Nguyễn Xuân Son",
        shirt: 12,
        pos: "CF",
        starting: true,
        minutes: 90
      },
      {
        name: "Nguyễn Đình Bắc",
        shirt: 9,
        pos: "LF",
        starting: true,
        minutes: 90
      },
      {
        name: "Phan Tuấn Tài",
        shirt: 24,
        pos: "DF",
        starting: false,
        minutes: 27,
        on: 63
      },
      {
        name: "Bùi Hoàng Việt Anh",
        shirt: 20,
        pos: "DF",
        starting: false,
        minutes: 27,
        on: 63
      },
      {
        name: "Lê Văn Đô",
        shirt: 26,
        pos: "MF",
        starting: false,
        minutes: 27,
        on: 63
      },
      {
        name: "Nguyễn Hai Long",
        shirt: 18,
        pos: "MF",
        starting: false,
        minutes: 14,
        on: 76
      },
      {
        name: "Nguyễn Trần Việt Cường",
        shirt: 22,
        pos: "FW",
        starting: false,
        minutes: 4,
        on: 86
      }
    ]
  },
  {
    key: "2026-07-31-VIE-SGP",
    competition: "ASEAN Cup 2026",
    round: "Bảng A",
    home: "VIE",
    away: "SGP",
    kickoff_at: "2026-07-31T13:00:00Z",
    venue: "SVĐ Mỹ Đình",
    city: "Hà Nội",
    status: "finished",
    home_score: 0,
    away_score: 0,
    attendance: 31569,
    goals: [],
    lineup: [
      {
        name: "Lê Giang Patrik",
        shirt: 1,
        pos: "GK",
        starting: true,
        minutes: 90
      },
      {
        name: "Phạm Xuân Mạnh",
        shirt: 7,
        pos: "CB",
        starting: true,
        minutes: 90,
        yellow: [
          28
        ]
      },
      {
        name: "Nguyễn Thành Chung",
        shirt: 16,
        pos: "CB",
        starting: true,
        minutes: 90
      },
      {
        name: "Đoàn Văn Hậu",
        shirt: 5,
        pos: "CB",
        starting: true,
        minutes: 90,
        off: 90
      },
      {
        name: "Trương Tiến Anh",
        shirt: 15,
        pos: "RWB",
        starting: true,
        minutes: 90
      },
      {
        name: "Nguyễn Văn Vĩ",
        shirt: 3,
        pos: "LWB",
        starting: true,
        minutes: 72,
        off: 72
      },
      {
        name: "Đỗ Hoàng Hên",
        shirt: 10,
        pos: "RM",
        starting: true,
        minutes: 72,
        off: 72
      },
      {
        name: "Nguyễn Quang Hải",
        shirt: 19,
        pos: "CM",
        starting: true,
        minutes: 90,
        captain: true,
        off: 90
      },
      {
        name: "Nguyễn Hoàng Đức",
        shirt: 14,
        pos: "CM",
        starting: true,
        minutes: 90
      },
      {
        name: "Nguyễn Đình Bắc",
        shirt: 9,
        pos: "LM",
        starting: true,
        minutes: 41,
        off: 41
      },
      {
        name: "Nguyễn Xuân Son",
        shirt: 12,
        pos: "CF",
        starting: true,
        minutes: 90
      },
      {
        name: "Nguyễn Tài Lộc",
        shirt: 13,
        pos: "FW",
        starting: false,
        minutes: 49,
        on: 41
      },
      {
        name: "Phan Tuấn Tài",
        shirt: 24,
        pos: "DF",
        starting: false,
        minutes: 18,
        on: 72
      },
      {
        name: "Nguyễn Hai Long",
        shirt: 18,
        pos: "MF",
        starting: false,
        minutes: 18,
        on: 72
      },
      {
        name: "Lê Phạm Thành Long",
        shirt: 8,
        pos: "MF",
        starting: false,
        minutes: 0,
        on: 90
      },
      {
        name: "Nguyễn Trần Việt Cường",
        shirt: 22,
        pos: "FW",
        starting: false,
        minutes: 0,
        on: 90
      }
    ]
  },
  {
    key: "2026-08-03-IDN-VIE",
    competition: "ASEAN Cup 2026",
    round: "Bảng A",
    home: "IDN",
    away: "VIE",
    kickoff_at: "2026-08-03T13:30:00Z",
    venue: "SVĐ Pakansari",
    city: "Bogor (Indonesia)",
    status: "finished",
    home_score: 0,
    away_score: 3,
    goals: [
      {
        minute: 6,
        player: "Nguyễn Văn Vĩ",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 14,
        player: "Nguyễn Hai Long",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 71,
        player: "Nguyễn Xuân Son",
        team: "VIE",
        type: "goal"
      }
    ],
    lineup: [
      {
        name: "Lê Giang Patrik",
        shirt: 1,
        pos: "GK",
        starting: true,
        minutes: 90
      },
      {
        name: "Bùi Hoàng Việt Anh",
        shirt: 20,
        pos: "CB",
        starting: true,
        minutes: 81,
        off: 81
      },
      {
        name: "Nguyễn Thành Chung",
        shirt: 16,
        pos: "CB",
        starting: true,
        minutes: 90
      },
      {
        name: "Phạm Xuân Mạnh",
        shirt: 7,
        pos: "CB",
        starting: true,
        minutes: 90
      },
      {
        name: "Trương Tiến Anh",
        shirt: 15,
        pos: "RWB",
        starting: true,
        minutes: 90
      },
      {
        name: "Nguyễn Văn Vĩ",
        shirt: 3,
        pos: "LWB",
        starting: true,
        minutes: 81,
        off: 81
      },
      {
        name: "Nguyễn Tài Lộc",
        shirt: 13,
        pos: "RM",
        starting: true,
        minutes: 63,
        off: 63
      },
      {
        name: "Lê Phạm Thành Long",
        shirt: 8,
        pos: "CM",
        starting: true,
        minutes: 90
      },
      {
        name: "Nguyễn Hoàng Đức",
        shirt: 14,
        pos: "CM",
        starting: true,
        minutes: 87,
        captain: true,
        off: 87
      },
      {
        name: "Nguyễn Hai Long",
        shirt: 18,
        pos: "LM",
        starting: true,
        minutes: 63,
        off: 63
      },
      {
        name: "Nguyễn Đình Bắc",
        shirt: 9,
        pos: "CF",
        starting: true,
        minutes: 90
      },
      {
        name: "Nguyễn Xuân Son",
        shirt: 12,
        pos: "FW",
        starting: false,
        minutes: 27,
        on: 63
      },
      {
        name: "Đỗ Hoàng Hên",
        shirt: 10,
        pos: "MF",
        starting: false,
        minutes: 27,
        on: 63
      },
      {
        name: "Đoàn Văn Hậu",
        shirt: 5,
        pos: "DF",
        starting: false,
        minutes: 9,
        on: 81
      },
      {
        name: "Nguyễn Nhật Minh",
        shirt: 6,
        pos: "DF",
        starting: false,
        minutes: 9,
        on: 81
      },
      {
        name: "Nguyễn Quang Hải",
        shirt: 19,
        pos: "MF",
        starting: false,
        minutes: 3,
        on: 87
      }
    ]
  },
  {
    key: "2026-08-07-VIE-CAM",
    competition: "ASEAN Cup 2026",
    round: "Bảng A",
    home: "VIE",
    away: "CAM",
    kickoff_at: "2026-08-07T13:00:00Z",
    venue: "SVĐ Mỹ Đình",
    city: "Hà Nội",
    status: "finished",
    home_score: 3,
    away_score: 1,
    goals: [
      {
        minute: 18,
        player: "Nguyễn Đình Bắc",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 71,
        player: "Iago Bento",
        team: "CAM",
        type: "goal"
      },
      {
        minute: 84,
        player: "Im Vakhim",
        team: "CAM",
        type: "own_goal"
      },
      {
        minute: 89,
        player: "Nguyễn Đình Bắc",
        team: "VIE",
        type: "goal"
      }
    ],
    lineup: [
      {
        name: "Lê Giang Patrik",
        shirt: 1,
        pos: "GK",
        starting: true,
        minutes: 90
      },
      {
        name: "Bùi Hoàng Việt Anh",
        shirt: 20,
        pos: "CB",
        starting: true,
        minutes: 90
      },
      {
        name: "Nguyễn Thành Chung",
        shirt: 16,
        pos: "CB",
        starting: true,
        minutes: 90
      },
      {
        name: "Phạm Xuân Mạnh",
        shirt: 7,
        pos: "CB",
        starting: true,
        minutes: 79,
        off: 79
      },
      {
        name: "Trương Tiến Anh",
        shirt: 15,
        pos: "RM",
        starting: true,
        minutes: 90,
        off: 90
      },
      {
        name: "Lê Phạm Thành Long",
        shirt: 8,
        pos: "CM",
        starting: true,
        minutes: 90
      },
      {
        name: "Nguyễn Hoàng Đức",
        shirt: 14,
        pos: "CM",
        starting: true,
        minutes: 46,
        off: 46
      },
      {
        name: "Nguyễn Hai Long",
        shirt: 18,
        pos: "LM",
        starting: true,
        minutes: 90
      },
      {
        name: "Nguyễn Quang Hải",
        shirt: 19,
        pos: "RF",
        starting: true,
        minutes: 79,
        captain: true,
        off: 79
      },
      {
        name: "Nguyễn Đình Bắc",
        shirt: 9,
        pos: "CF",
        starting: true,
        minutes: 90
      },
      {
        name: "Nguyễn Văn Vĩ",
        shirt: 3,
        pos: "LF",
        starting: true,
        minutes: 66,
        off: 66
      },
      {
        name: "Nguyễn Xuân Son",
        shirt: 12,
        pos: "FW",
        starting: false,
        minutes: 44,
        on: 46
      },
      {
        name: "Nguyễn Tài Lộc",
        shirt: 13,
        pos: "MF",
        starting: false,
        minutes: 24,
        on: 66
      },
      {
        name: "Khổng Minh Gia Bảo",
        shirt: 11,
        pos: "DF",
        starting: false,
        minutes: 11,
        on: 79
      },
      {
        name: "Nguyễn Trần Việt Cường",
        shirt: 22,
        pos: "FW",
        starting: false,
        minutes: 11,
        on: 79
      },
      {
        name: "Phạm Gia Hưng",
        shirt: 17,
        pos: "FW",
        starting: false,
        minutes: 0,
        on: 90
      }
    ]
  },
  {
    key: "2026-08-16-MAS-VIE",
    competition: "ASEAN Cup 2026",
    round: "Bán kết - Lượt đi",
    home: "MAS",
    away: "VIE",
    kickoff_at: "2026-08-16T13:00:00Z",
    venue: "SVĐ Kuala Lumpur",
    city: "Kuala Lumpur",
    status: "finished",
    home_score: 0,
    away_score: 2,
    goals: [
      {
        minute: 45,
        extra: 5,
        player: "Nguyễn Xuân Son",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 86,
        player: "Faris Danish",
        team: "MAS",
        type: "own_goal"
      }
    ],
    lineup: [
      {
        name: "Lê Giang Patrik",
        shirt: 1,
        pos: "GK",
        starting: true,
        minutes: 90
      },
      {
        name: "Bùi Hoàng Việt Anh",
        shirt: 20,
        pos: "CB",
        starting: true,
        minutes: 90
      },
      {
        name: "Nguyễn Thành Chung",
        shirt: 16,
        pos: "CB",
        starting: true,
        minutes: 90
      },
      {
        name: "Phạm Xuân Mạnh",
        shirt: 7,
        pos: "CB",
        starting: true,
        minutes: 90
      },
      {
        name: "Trương Tiến Anh",
        shirt: 15,
        pos: "RM",
        starting: true,
        minutes: 90
      },
      {
        name: "Lê Phạm Thành Long",
        shirt: 8,
        pos: "CM",
        starting: true,
        minutes: 81,
        off: 81
      },
      {
        name: "Nguyễn Hoàng Đức",
        shirt: 14,
        pos: "CM",
        starting: true,
        minutes: 90,
        captain: true,
        off: 90
      },
      {
        name: "Nguyễn Văn Vĩ",
        shirt: 3,
        pos: "LM",
        starting: true,
        minutes: 90,
        off: 90
      },
      {
        name: "Nguyễn Tài Lộc",
        shirt: 13,
        pos: "RF",
        starting: true,
        minutes: 70,
        off: 70
      },
      {
        name: "Nguyễn Xuân Son",
        shirt: 12,
        pos: "CF",
        starting: true,
        minutes: 81,
        off: 81
      },
      {
        name: "Nguyễn Đình Bắc",
        shirt: 9,
        pos: "LF",
        starting: true,
        minutes: 90,
        yellow: [
          32
        ]
      },
      {
        name: "Đỗ Hoàng Hên",
        shirt: 10,
        pos: "MF",
        starting: false,
        minutes: 20,
        on: 70
      },
      {
        name: "Nguyễn Quang Hải",
        shirt: 19,
        pos: "MF",
        starting: false,
        minutes: 9,
        on: 81
      },
      {
        name: "Nguyễn Hai Long",
        shirt: 18,
        pos: "MF",
        starting: false,
        minutes: 9,
        on: 81
      },
      {
        name: "Đoàn Văn Hậu",
        shirt: 5,
        pos: "DF",
        starting: false,
        minutes: 0,
        on: 90
      },
      {
        name: "Nguyễn Nhật Minh",
        shirt: 6,
        pos: "DF",
        starting: false,
        minutes: 0,
        on: 90
      }
    ]
  },
  {
    key: "2026-08-19-VIE-MAS",
    competition: "ASEAN Cup 2026",
    round: "Bán kết - Lượt về",
    home: "VIE",
    away: "MAS",
    kickoff_at: "2026-08-19T13:00:00Z",
    venue: "SVĐ Mỹ Đình",
    city: "Hà Nội",
    status: "finished",
    home_score: 2,
    away_score: 0,
    attendance: 37966,
    note: "Việt Nam vào chung kết với tổng tỷ số 4-0.",
    goals: [
      {
        minute: 62,
        player: "Nguyễn Xuân Son",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 89,
        player: "Nguyễn Xuân Son",
        team: "VIE",
        type: "goal"
      }
    ],
    lineup: [
      {
        name: "Lê Giang Patrik",
        shirt: 1,
        pos: "GK",
        starting: true,
        minutes: 90
      },
      {
        name: "Phạm Xuân Mạnh",
        shirt: 7,
        pos: "CB",
        starting: true,
        minutes: 90
      },
      {
        name: "Nguyễn Thành Chung",
        shirt: 16,
        pos: "CB",
        starting: true,
        minutes: 90
      },
      {
        name: "Đoàn Văn Hậu",
        shirt: 5,
        pos: "CB",
        starting: true,
        minutes: 80,
        off: 80
      },
      {
        name: "Trương Tiến Anh",
        shirt: 15,
        pos: "RM",
        starting: true,
        minutes: 90
      },
      {
        name: "Nguyễn Hoàng Đức",
        shirt: 14,
        pos: "CM",
        starting: true,
        minutes: 71,
        off: 71
      },
      {
        name: "Nguyễn Quang Hải",
        shirt: 19,
        pos: "CM",
        starting: true,
        minutes: 90,
        captain: true
      },
      {
        name: "Phan Tuấn Tài",
        shirt: 24,
        pos: "LM",
        starting: true,
        minutes: 71,
        off: 71
      },
      {
        name: "Đỗ Hoàng Hên",
        shirt: 10,
        pos: "RF",
        starting: true,
        minutes: 59,
        off: 59
      },
      {
        name: "Nguyễn Đình Bắc",
        shirt: 9,
        pos: "CF",
        starting: true,
        minutes: 90
      },
      {
        name: "Nguyễn Hai Long",
        shirt: 18,
        pos: "LF",
        starting: true,
        minutes: 59,
        off: 59
      },
      {
        name: "Nguyễn Tài Lộc",
        shirt: 13,
        pos: "FW",
        starting: false,
        minutes: 31,
        on: 59
      },
      {
        name: "Nguyễn Xuân Son",
        shirt: 12,
        pos: "FW",
        starting: false,
        minutes: 31,
        on: 59,
        yellow: [
          65
        ]
      },
      {
        name: "Nguyễn Văn Vĩ",
        shirt: 3,
        pos: "MF",
        starting: false,
        minutes: 19,
        on: 71,
        yellow: [
          72
        ]
      },
      {
        name: "Lê Phạm Thành Long",
        shirt: 8,
        pos: "MF",
        starting: false,
        minutes: 19,
        on: 71
      },
      {
        name: "Đinh Quang Kiệt",
        shirt: 4,
        pos: "DF",
        starting: false,
        minutes: 10,
        on: 80
      }
    ]
  },
  {
    key: "2026-08-22-THA-VIE",
    competition: "ASEAN Cup 2026",
    round: "Chung kết - Lượt đi",
    home: "THA",
    away: "VIE",
    kickoff_at: "2026-08-22T13:00:00Z",
    venue: "SVĐ Rajamangala",
    city: "Bangkok",
    status: "finished",
    home_score: 0,
    away_score: 2,
    attendance: 26415,
    goals: [
      {
        minute: 62,
        player: "Nguyễn Hai Long",
        team: "VIE",
        type: "goal"
      },
      {
        minute: 69,
        player: "Nguyễn Quang Hải",
        team: "VIE",
        type: "goal"
      }
    ],
    lineup: [
      {
        name: "Lê Giang Patrik",
        shirt: 1,
        pos: "GK",
        starting: true,
        minutes: 90
      },
      {
        name: "Phạm Xuân Mạnh",
        shirt: 7,
        pos: "CB",
        starting: true,
        minutes: 90
      },
      {
        name: "Nguyễn Thành Chung",
        shirt: 16,
        pos: "CB",
        starting: true,
        minutes: 90,
        yellow: [
          57
        ]
      },
      {
        name: "Đoàn Văn Hậu",
        shirt: 5,
        pos: "CB",
        starting: true,
        minutes: 90
      },
      {
        name: "Trương Tiến Anh",
        shirt: 15,
        pos: "RWB",
        starting: true,
        minutes: 90
      },
      {
        name: "Nguyễn Văn Vĩ",
        shirt: 3,
        pos: "LWB",
        starting: true,
        minutes: 90
      },
      {
        name: "Đỗ Hoàng Hên",
        shirt: 10,
        pos: "RM",
        starting: true,
        minutes: 76,
        off: 76
      },
      {
        name: "Lê Phạm Thành Long",
        shirt: 8,
        pos: "CM",
        starting: true,
        minutes: 58,
        off: 58
      },
      {
        name: "Nguyễn Hoàng Đức",
        shirt: 14,
        pos: "CM",
        starting: true,
        minutes: 90,
        captain: true
      },
      {
        name: "Nguyễn Đình Bắc",
        shirt: 9,
        pos: "LM",
        starting: true,
        minutes: 90,
        off: 90
      },
      {
        name: "Nguyễn Xuân Son",
        shirt: 12,
        pos: "CF",
        starting: true,
        minutes: 58,
        off: 58
      },
      {
        name: "Nguyễn Quang Hải",
        shirt: 19,
        pos: "MF",
        starting: false,
        minutes: 32,
        on: 58
      },
      {
        name: "Nguyễn Hai Long",
        shirt: 18,
        pos: "MF",
        starting: false,
        minutes: 32,
        on: 58
      },
      {
        name: "Nguyễn Tài Lộc",
        shirt: 13,
        pos: "MF",
        starting: false,
        minutes: 14,
        on: 76
      },
      {
        name: "Nguyễn Trần Việt Cường",
        shirt: 22,
        pos: "FW",
        starting: false,
        minutes: 0,
        on: 90
      }
    ]
  },
  {
    key: "2026-08-26-VIE-THA",
    competition: "ASEAN Cup 2026",
    round: "Chung kết - Lượt về",
    home: "VIE",
    away: "THA",
    kickoff_at: "2026-08-26T13:00:00Z",
    venue: "SVĐ Mỹ Đình",
    city: "Hà Nội",
    status: "finished",
    home_score: 2,
    away_score: 2,
    attendance: 38646,
    is_final: true,
    note: "Việt Nam vô địch ASEAN Cup 2026 với tổng tỷ số 4-2 — lần đầu bảo vệ thành công ngôi vô địch.",
    goals: [
      {
        minute: 12,
        player: "Yotsakorn Burapha",
        team: "THA",
        type: "goal"
      },
      {
        minute: 52,
        player: "Chatchai Budprom",
        team: "THA",
        type: "own_goal"
      },
      {
        minute: 85,
        player: "Wanchai Jarunongkran",
        team: "THA",
        type: "goal"
      },
      {
        minute: 90,
        extra: 3,
        player: "Wanchai Jarunongkran",
        team: "THA",
        type: "own_goal"
      }
    ],
    lineup: [
      {
        name: "Lê Giang Patrik",
        shirt: 1,
        pos: "GK",
        starting: true,
        minutes: 90
      },
      {
        name: "Phạm Xuân Mạnh",
        shirt: 7,
        pos: "CB",
        starting: true,
        minutes: 90
      },
      {
        name: "Nguyễn Thành Chung",
        shirt: 16,
        pos: "CB",
        starting: true,
        minutes: 90
      },
      {
        name: "Đoàn Văn Hậu",
        shirt: 5,
        pos: "CB",
        starting: true,
        minutes: 90
      },
      {
        name: "Trương Tiến Anh",
        shirt: 15,
        pos: "RM",
        starting: true,
        minutes: 90
      },
      {
        name: "Lê Phạm Thành Long",
        shirt: 8,
        pos: "CM",
        starting: true,
        minutes: 68,
        off: 68
      },
      {
        name: "Nguyễn Hoàng Đức",
        shirt: 14,
        pos: "CM",
        starting: true,
        minutes: 79,
        captain: true,
        off: 79
      },
      {
        name: "Nguyễn Văn Vĩ",
        shirt: 3,
        pos: "LM",
        starting: true,
        minutes: 9,
        off: 9
      },
      {
        name: "Đỗ Hoàng Hên",
        shirt: 10,
        pos: "RF",
        starting: true,
        minutes: 68,
        off: 68
      },
      {
        name: "Nguyễn Xuân Son",
        shirt: 12,
        pos: "CF",
        starting: true,
        minutes: 90
      },
      {
        name: "Nguyễn Đình Bắc",
        shirt: 9,
        pos: "LF",
        starting: true,
        minutes: 90
      },
      {
        name: "Phan Tuấn Tài",
        shirt: 24,
        pos: "DF",
        starting: false,
        minutes: 81,
        on: 9
      },
      {
        name: "Nguyễn Quang Hải",
        shirt: 19,
        pos: "MF",
        starting: false,
        minutes: 22,
        on: 68
      },
      {
        name: "Nguyễn Hai Long",
        shirt: 18,
        pos: "MF",
        starting: false,
        minutes: 22,
        on: 68
      },
      {
        name: "Nguyễn Tài Lộc",
        shirt: 13,
        pos: "MF",
        starting: false,
        minutes: 11,
        on: 79
      }
    ]
  },
  {
    key: "2026-09-26-VIE-PHI",
    competition: "FIFA ASEAN Cup 2026",
    round: "Bảng B - Lượt 1",
    home: "VIE",
    away: "PHI",
    kickoff_at: "2026-09-26T13:02:00Z",
    venue: "SVĐ Si Jalak Harupat",
    city: "Bandung (Indonesia)",
    status: "finished",
    home_score: 1,
    away_score: 0,
    note: "Trận đấu bắt đầu muộn 32 phút so với lịch (19:30) do mưa lớn và sấm sét.",
    goals: [
      {
        minute: 25,
        player: "Nguyễn Đình Bắc",
        team: "VIE",
        type: "goal"
      }
    ]
  },
  {
    key: "2026-09-29-THA-VIE",
    competition: "FIFA ASEAN Cup 2026",
    round: "Bảng B - Lượt 2",
    home: "THA",
    away: "VIE",
    kickoff_at: "2026-09-29T12:30:00Z",
    venue: "SVĐ Si Jalak Harupat",
    city: "Bandung (Indonesia)",
    status: "scheduled"
  },
  {
    key: "2026-10-02-VIE-PAK",
    competition: "FIFA ASEAN Cup 2026",
    round: "Bảng B - Lượt 3",
    home: "VIE",
    away: "PAK",
    kickoff_at: "2026-10-02T09:00:00Z",
    venue: "SVĐ Gelora Bung Karno",
    city: "Jakarta",
    status: "scheduled"
  },
  {
    key: "2027-01-05-QAT-VIE",
    competition: "Giao hữu quốc tế",
    round: "Giao hữu",
    home: "QAT",
    away: "VIE",
    kickoff_at: "2027-01-05T05:00:00Z",
    kickoff_time_tbd: true,
    venue: null,
    city: "Qatar",
    status: "scheduled"
  },
  {
    key: "2027-01-11-UAE-VIE",
    competition: "Asian Cup 2027",
    round: "Bảng E - Lượt 1",
    home: "UAE",
    away: "VIE",
    kickoff_at: "2027-01-11T05:00:00Z",
    kickoff_time_tbd: true,
    venue: "SVĐ Đại học King Saud",
    city: "Riyadh (Ả Rập Xê Út)",
    status: "scheduled"
  },
  {
    key: "2027-01-15-VIE-KOR",
    competition: "Asian Cup 2027",
    round: "Bảng E - Lượt 2",
    home: "VIE",
    away: "KOR",
    kickoff_at: "2027-01-15T05:00:00Z",
    kickoff_time_tbd: true,
    venue: "Kingdom Arena",
    city: "Riyadh (Ả Rập Xê Út)",
    status: "scheduled"
  },
  {
    key: "2027-01-20-VIE-YEM",
    competition: "Asian Cup 2027",
    round: "Bảng E - Lượt 3",
    home: "VIE",
    away: "YEM",
    kickoff_at: "2027-01-20T05:00:00Z",
    kickoff_time_tbd: true,
    venue: "SVĐ Thành phố thể thao Hoàng tử Abdullah Al Faisal",
    city: "Jeddah (Ả Rập Xê Út)",
    status: "scheduled"
  }
];

export const REAL_SEASONS = [
  {
    competition_code: "fifa-asean-cup",
    competition_name: "FIFA ASEAN Cup",
    competition_type: "regional",
    confederation: "FIFA",
    name: "2026",
    match_competition: "FIFA ASEAN Cup 2026",
    start_date: "2026-09-24",
    end_date: "2026-10-05",
    is_current: true,
    group_name: "Bảng B",
    standings: [
      {
        fifa_code: "THA",
        position: 1,
        played: 1,
        won: 1,
        drawn: 0,
        lost: 0,
        goals_for: 4,
        goals_against: 0,
        points: 3
      },
      {
        fifa_code: "VIE",
        position: 2,
        played: 1,
        won: 1,
        drawn: 0,
        lost: 0,
        goals_for: 1,
        goals_against: 0,
        points: 3
      },
      {
        fifa_code: "PHI",
        position: 3,
        played: 1,
        won: 0,
        drawn: 0,
        lost: 1,
        goals_for: 0,
        goals_against: 1,
        points: 0
      },
      {
        fifa_code: "PAK",
        position: 4,
        played: 1,
        won: 0,
        drawn: 0,
        lost: 1,
        goals_for: 0,
        goals_against: 4,
        points: 0
      }
    ]
  },
  {
    competition_code: "asean-cup",
    competition_name: "ASEAN Cup",
    competition_type: "regional",
    confederation: "AFF",
    name: "2026",
    match_competition: "ASEAN Cup 2026",
    start_date: "2026-07-24",
    end_date: "2026-08-26",
    is_current: false,
    group_name: "Bảng A",
    standings: [
      {
        fifa_code: "VIE",
        position: 1,
        played: 4,
        won: 3,
        drawn: 1,
        lost: 0,
        goals_for: 13,
        goals_against: 1,
        points: 10
      },
      {
        fifa_code: "SGP",
        position: 2,
        played: 4,
        won: 2,
        drawn: 2,
        lost: 0,
        goals_for: 5,
        goals_against: 2,
        points: 8
      },
      {
        fifa_code: "IDN",
        position: 3,
        played: 4,
        won: 2,
        drawn: 1,
        lost: 1,
        goals_for: 9,
        goals_against: 5,
        points: 7
      },
      {
        fifa_code: "CAM",
        position: 4,
        played: 4,
        won: 1,
        drawn: 0,
        lost: 3,
        goals_for: 6,
        goals_against: 10,
        points: 3
      },
      {
        fifa_code: "TLS",
        position: 5,
        played: 4,
        won: 0,
        drawn: 0,
        lost: 4,
        goals_for: 0,
        goals_against: 15,
        points: 0
      }
    ]
  },
  {
    competition_code: "asian-cup-q",
    competition_name: "Vòng loại Asian Cup 2027",
    competition_type: "continental",
    confederation: "AFC",
    name: "2027 vòng loại",
    match_competition: "Vòng loại Asian Cup 2027",
    start_date: "2025-03-25",
    end_date: "2026-03-31",
    is_current: false,
    group_name: "Bảng F",
    standings: [
      {
        fifa_code: "VIE",
        position: 1,
        played: 6,
        won: 6,
        drawn: 0,
        lost: 0,
        goals_for: 17,
        goals_against: 2,
        points: 18
      },
      {
        fifa_code: "MAS",
        position: 2,
        played: 6,
        won: 3,
        drawn: 0,
        lost: 3,
        goals_for: 10,
        goals_against: 10,
        points: 9
      },
      {
        fifa_code: "LAO",
        position: 3,
        played: 6,
        won: 2,
        drawn: 0,
        lost: 4,
        goals_for: 4,
        goals_against: 16,
        points: 6
      },
      {
        fifa_code: "NEP",
        position: 4,
        played: 6,
        won: 1,
        drawn: 0,
        lost: 5,
        goals_for: 5,
        goals_against: 8,
        points: 3
      }
    ]
  },
  {
    competition_code: "asian-cup",
    competition_name: "Asian Cup",
    competition_type: "continental",
    confederation: "AFC",
    name: "2027",
    match_competition: "Asian Cup 2027",
    start_date: "2027-01-07",
    end_date: "2027-02-05",
    is_current: false,
    group_name: "Bảng E",
    standings: []
  },
  {
    competition_code: "asean-cup",
    competition_name: "ASEAN Cup",
    competition_type: "regional",
    confederation: "AFF",
    name: "2024",
    match_competition: "ASEAN Cup 2024",
    start_date: "2024-12-08",
    end_date: "2025-01-05",
    is_current: false,
    group_name: "Bảng B",
    standings: []
  }
];

export const FIFA_RANKING_SNAPSHOT = '2026-07-20';
export const REAL_FIFA_RANKINGS: Array<{ fifa_code: string; rank: number; points: number; previous_rank: number }> = [
  {
    fifa_code: "JPN",
    rank: 17,
    points: 1673.68,
    previous_rank: 18
  },
  {
    fifa_code: "KOR",
    rank: 32,
    points: 1558.72,
    previous_rank: 25
  },
  {
    fifa_code: "QAT",
    rank: 59,
    points: 1411.06,
    previous_rank: 56
  },
  {
    fifa_code: "UAE",
    rank: 68,
    points: 1370.47,
    previous_rank: 68
  },
  {
    fifa_code: "THA",
    rank: 94,
    points: 1250.8,
    previous_rank: 94
  },
  {
    fifa_code: "VIE",
    rank: 99,
    points: 1227.2,
    previous_rank: 99
  },
  {
    fifa_code: "IDN",
    rank: 118,
    points: 1157.14,
    previous_rank: 118
  },
  {
    fifa_code: "PHI",
    rank: 135,
    points: 1100.95,
    previous_rank: 135
  },
  {
    fifa_code: "MAS",
    rank: 136,
    points: 1086.22,
    previous_rank: 136
  },
  {
    fifa_code: "YEM",
    rank: 145,
    points: 1065.24,
    previous_rank: 145
  },
  {
    fifa_code: "SGP",
    rank: 148,
    points: 1057.95,
    previous_rank: 148
  },
  {
    fifa_code: "MYA",
    rank: 158,
    points: 1009.39,
    previous_rank: 158
  },
  {
    fifa_code: "CAM",
    rank: 175,
    points: 922.32,
    previous_rank: 175
  },
  {
    fifa_code: "NEP",
    rank: 177,
    points: 914.54,
    previous_rank: 177
  },
  {
    fifa_code: "BAN",
    rank: 181,
    points: 902.93,
    previous_rank: 181
  },
  {
    fifa_code: "LAO",
    rank: 185,
    points: 885.03,
    previous_rank: 185
  },
  {
    fifa_code: "PAK",
    rank: 198,
    points: 840.28,
    previous_rank: 198
  },
  {
    fifa_code: "TLS",
    rank: 201,
    points: 831,
    previous_rank: 201
  }
];

/** Hạng FIFA cao nhất lịch sử: 84, tháng 9/1998 (infobox en.wikipedia) — app chỉ hiện năm */
export const BEST_FIFA_RANK = { rank: 84, date: '1998-09-01' };
